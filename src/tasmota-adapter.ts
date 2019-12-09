/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property } from 'gateway-addon';
import fetch from 'node-fetch';
import dnssd from 'dnssd';

class OnOffProperty extends Property {
  private lastState?: boolean;

  constructor(private device: Device, private set: (value: boolean) => Promise<void>) {
    super(device, 'on', {
      '@type': 'OnOffProperty',
      type: 'boolean',
      title: 'On',
      description: 'Wether the device is on or off'
    });
  }

  async setValue(value: boolean) {
    try {
      console.log(`Set value of ${this.device.name} / ${this.title} to ${value}`);
      await super.setValue(value);
      this.set(value);
    } catch (e) {
      console.log(`Could not set value: ${e}`);
    }
  }

  update(value: boolean) {
    if (this.lastState != value) {
      this.lastState = value;
      this.setCachedValue(value);
      this.device.notifyPropertyChanged(this);
      console.log(`Value of ${this.device.name} / ${this.title} changed to ${value}`);
    }
  }
}

class Switch extends Device {
  private onOffProperty: OnOffProperty;

  constructor(adapter: Adapter, id: string, private host: string) {
    super(adapter, id);
    this['@context'] = 'https://iot.mozilla.org/schemas/';
    this['@type'] = ['Light'];
    this.name = id;

    this.onOffProperty = new OnOffProperty(this, async value => {
      const status = value ? 'ON' : 'OFF';
      const result = await fetch(`http://${host}/cm?cmnd=Power0%20${status}`);

      if (result.status != 200) {
        console.log('Could not set status');
      }
    });

    this.addProperty(this.onOffProperty);
  }

  addProperty(property: Property) {
    this.properties.set(property.name, property);
  }

  public startPolling(intervalMs: number) {
    setInterval(() => this.poll(), intervalMs);
  }

  public async poll() {
    const response = await fetch(`http://${this.host}/cm?cmnd=Power`);
    const result = await response.json();
    const value = result.POWER == 'ON';
    this.onOffProperty.update(value);
  }
}

export class TasmotaAdapter extends Adapter {
  private devices: { [key: string]: Switch } = {};

  constructor(addonManager: any, manifest: any) {
    super(addonManager, manifest.display_name, manifest.id);
    addonManager.addAdapter(this);

    const {
      pollInterval
    } = manifest.moziot.config;

    new dnssd.Browser(dnssd.tcp('http'))
      .on('serviceUp', async service => {
        const host = this.removeTrailingDot(service.host);
        const url = `${host}:${service.port}`;
        console.log(`Discovered http service at ${url}`);
        const result = await fetch(`http://${url}`);

        if (result.status == 200) {
          const body = await result.text();

          if (body.indexOf('Tasmota') >= 0) {
            console.log(`Discovered device at ${url}`);
            let device = this.devices[host];

            if (!device) {
              device = new Switch(this, host, service?.addresses[0] || host);
              this.devices[host] = device;
              this.handleDeviceAdded(device);
              device.startPolling(Math.max(pollInterval || 1000, 500));
            }
          }
        }
      })
      .start();
  }

  private removeTrailingDot(str: string) {
    if (str.length > 0 && str.lastIndexOf('.') === (str.length - 1)) {
      return str.substring(0, str.length - 1);
    }

    return str;
  }
}
