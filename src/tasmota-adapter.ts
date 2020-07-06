/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Database } from 'gateway-addon';
import fetch from 'node-fetch';
import { Browser, tcp } from 'dnssd';
import { isIPv4 } from 'net';
import { PowerPlug, OnOffProperty } from './power-plug';
import { authConfig, getData, getStatus } from './api';
import { ColorCtLight } from "./color-ct-light";
import { ColorLight } from "./color-light";
import { ColorTemperatureLight } from "./color-temperature-light";
import { DimmableLight } from "./dimmable-light";
import crypto from 'crypto';
import { setup, debug } from './logger';
import { DataResult } from './table-parser';

export class TasmotaAdapter extends Adapter {
  private httpBrowser?: Browser;
  private devices: { [key: string]: PowerPlug } = {};

  constructor(addonManager: any, private manifest: any) {
    super(addonManager, manifest.display_name, manifest.id);
    addonManager.addAdapter(this);

    const {
      logging
    } = manifest.moziot.config;

    setup(logging?.debug);

    this.load();
    this.startDiscovery();

    setTimeout(() => {
      this.stopDiscovery();
    }, 5000);
  }

  public startPairing(_timeoutSeconds: number) {
    debug('Start pairing');
    this.startDiscovery();
    this.load();
  }

  private async load() {
    debug(`Loading devices from config`);

    const {
      pollInterval,
      password
    } = this.manifest.moziot.config;

    const defaultPassword = password;

    const db = new Database(this.manifest.name);
    await db.open();
    const config = await db.loadConfig();

    if (config.devices) {
      for (const device of config.devices) {
        const {
          hostname,
          port,
          password
        } = device;

        if (!device.id) {
          device.id = `${crypto.randomBytes(16).toString('hex')}`;
          debug(`Adding id for device at ${hostname}`);
        }

        const url = `${hostname}:${port}`;
        await this.createDevice(url, hostname, hostname, password || defaultPassword, pollInterval);
      }
    }

    await db.saveConfig(config);
  }

  private startDiscovery() {
    debug('Starting discovery');
    this.httpBrowser = new Browser(tcp('http'));

    this.httpBrowser.on('serviceUp', async service => {
      const host = this.removeTrailingDot(service.host);
      debug(`Discovered http service at ${host}`);
      const addresses: string[] = service?.addresses;
      this.handleService(host, addresses.filter(isIPv4)[0] || host, service.port);
    });

    this.httpBrowser.start();
  }

  private removeTrailingDot(str: string) {
    if (str.length > 0 && str.lastIndexOf('.') === (str.length - 1)) {
      return str.substring(0, str.length - 1);
    }

    return str;
  }

  private async handleService(name: string, host: string, port: number) {
    const {
      pollInterval,
      password
    } = this.manifest.moziot.config;

    const url = `${host}:${port}`;

    debug(`Probing ${url}`);

    const result = await fetch(`http://${url}`, authConfig(password));

    if (result.status == 200) {
      const body = await result.text();

      if (body.indexOf('Tasmota') >= 0) {
        debug(`Discovered Tasmota at ${name}`);
        await this.createDevice(url, name, host, password, pollInterval);
      } else {
        debug(`${name} seems not to be a Tasmota device`);
      }
    } else {
      debug(`${name} responded with ${result.statusText} (${result.status})`);
    }
  }

  private async createDevice(url: string, name: string, host: string, password: string, pollInterval: number) {
    let existingDevice = this.devices[name];

    if (!existingDevice) {
      debug(`Creating device ${name} (${host})`);
      let data: DataResult = {};

      try {
        data = await getData(url, password);
      } catch (e) {
        console.warn(`Could not get data: ${e}`);
      }

      const channels = await OnOffProperty.getAvailableChannels(host, password);
      const friendlyNames = await OnOffProperty.getFriendlyNames(host, password);
      const device = new PowerPlug(this, name, this.manifest, host, password, data, channels, friendlyNames['FriendlyName1']);
      this.devices[name] = device;
      this.handleDeviceAdded(device);
      device.startPolling(Math.max(pollInterval || 1000, 500));

      const colorResponse = await getStatus(host, password, 'Color');
      const colorResult = await colorResponse.json();
      const color: string = colorResult?.Color || "";

      const {
        experimental
      } = this.manifest.moziot.config;

      switch (color.length) {
        case 2:
          debug('Found dimmable light');
          const dimmableLight = new DimmableLight(this, `${name}-light`, host, password);
          this.handleDeviceAdded(dimmableLight);
          dimmableLight.startPolling(Math.max(pollInterval || 1000, 500));
          break;
        case 4:
          debug('Found color temperature light');
          const colorTemperatureLight = new ColorTemperatureLight(this, `${name}-light`, host, password);
          this.handleDeviceAdded(colorTemperatureLight);
          colorTemperatureLight.startPolling(Math.max(pollInterval || 1000, 500));
          break;
        case 6:
        case 8:
          debug('Found color light');
          const colorDevice = new ColorLight(this, `${name}-color`, host, password, this.manifest);
          this.handleDeviceAdded(colorDevice);
          colorDevice.startPolling(Math.max(pollInterval || 1000, 500));
          break;
        case 10:
          let device;

          if (experimental?.colorMode) {
            device = new ColorCtLight(this, `${name}-color`, host, password, this.manifest);
          } else {
            device = new ColorLight(this, `${name}-color`, host, password, this.manifest);
          }

          debug(`Found ${device.constructor.name}`);
          this.handleDeviceAdded(device);
          device.startPolling(Math.max(pollInterval || 1000, 500));
          break;
      }
    }
  }

  public cancelPairing() {
    debug('Cancel pairing');
    this.stopDiscovery();
  }

  private stopDiscovery() {
    if (this.httpBrowser) {
      this.httpBrowser.stop();
      this.httpBrowser = undefined;
    }
  }
}
