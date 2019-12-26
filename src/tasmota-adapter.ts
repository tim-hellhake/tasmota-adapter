/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter } from 'gateway-addon';
import fetch from 'node-fetch';
import { Browser, tcp } from 'dnssd';
import { isIPv4 } from 'net';
import { PowerPlug } from './power-plug';
import { authConfig, getData } from './api';

export class TasmotaAdapter extends Adapter {
  private httpBrowser?: Browser;
  private devices: { [key: string]: PowerPlug } = {};

  constructor(addonManager: any, private manifest: any) {
    super(addonManager, manifest.display_name, manifest.id);
    addonManager.addAdapter(this);
    this.startDiscovery();

    setTimeout(() => {
      this.stopDiscovery();
    }, 5000);
  }

  public startPairing(_timeoutSeconds: number) {
    console.log('Start pairing');
    this.startDiscovery();
  }

  private startDiscovery() {
    this.httpBrowser = new Browser(tcp('http'));

    this.httpBrowser.on('serviceUp', async service => {
      const host = this.removeTrailingDot(service.host);
      console.log(`Discovered http service at ${host}`);
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

    console.log(`Probing ${url}`);

    const result = await fetch(`http://${url}`, authConfig(password));

    if (result.status == 200) {
      const body = await result.text();

      if (body.indexOf('Tasmota') >= 0) {
        console.log(`Discovered Tasmota at ${name}`);
        let device = this.devices[name];

        if (!device) {
          const data = await getData(url);
          device = new PowerPlug(this, name, host, password, data);
          this.devices[name] = device;
          this.handleDeviceAdded(device);
          device.startPolling(Math.max(pollInterval || 1000, 500));
        }
      } else {
        console.log(`${name} seems not to be a Tasmota device`);
      }
    } else {
      console.log(`${name} responded with ${result.statusText} (${result.status})`);
    }
  }

  public cancelPairing() {
    console.log('Cancel pairing');
    this.stopDiscovery();
  }

  private stopDiscovery() {
    if (this.httpBrowser) {
      this.httpBrowser.stop();
      this.httpBrowser = undefined;
    }
  }
}
