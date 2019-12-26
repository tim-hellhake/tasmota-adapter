/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property } from 'gateway-addon';
import { Data } from './table-parser';
import { CommandResult, getData, getStatus, setStatus } from './api';

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
            this.setCachedValueAndNotify(value);
            console.log(`Value of ${this.device.name} / ${this.title} changed to ${value}`);
        }
    }
}

export class PowerPlug extends Device {
    private onOffProperty: OnOffProperty;
    private voltageProperty?: Property;
    private powerProperty?: Property;
    private currentProperty?: Property;

    constructor(adapter: Adapter, id: string, private host: string, private password: string, data: { [name: string]: Data }) {
        super(adapter, id);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['SmartPlug'];
        this.name = id;

        this.onOffProperty = new OnOffProperty(this, async value => {
            const status = value ? 'ON' : 'OFF';
            const result = await setStatus(host, password, 'Power0', status);

            if (result.status != 200) {
                console.log(`Could not set status: ${result.statusText} (${result.status})`);
            } else {
                const json: CommandResult = await result.json();

                if (json.WARNING) {
                    if (json.WARNING) {
                        console.log(`Could not set status: ${json.WARNING}`);
                    }

                    if (json.Command) {
                        console.log(`Could not set status: ${json.Command}`);
                    }
                }
            }
        });

        this.addProperty(this.onOffProperty);

        console.log(`Parsed data: ${JSON.stringify(data)}`);

        const voltageDate = data['Voltage'];

        if (voltageDate) {
            this.voltageProperty = new Property(this, 'voltage', {
                '@type': 'VoltageProperty',
                type: 'integer',
                unit: 'volt',
                title: 'Voltage'
            });

            this.addProperty(this.voltageProperty);
        }

        const currentDate = data['Current'];

        if (currentDate) {
            this.currentProperty = new Property(this, 'current', {
                '@type': 'CurrentProperty',
                type: 'number',
                unit: 'ampere',
                title: 'Current'
            });

            this.addProperty(this.currentProperty);
        }

        const powerDate = data['Power'];

        if (powerDate) {
            this.powerProperty = new Property(this, 'power', {
                '@type': 'InstantaneousPowerProperty',
                type: 'number',
                unit: 'watt',
                title: 'Power'
            });

            this.addProperty(this.powerProperty);
        }

        this.updatePowerProperties(data);
    }

    addProperty(property: Property) {
        this.properties.set(property.name, property);
    }

    public startPolling(intervalMs: number) {
        setInterval(() => this.poll(), intervalMs);
    }

    public async poll() {
        const response = await getStatus(this.host, this.password, 'Power');
        const result = await response.json();
        const value = result.POWER == 'ON';
        this.onOffProperty.update(value);

        const data = await getData(this.host);
        this.updatePowerProperties(data);
    }

    private updatePowerProperties(data: { [name: string]: Data }) {
        const voltageDate = data['Voltage'];

        if (voltageDate && this.voltageProperty) {
            this.voltageProperty.setCachedValueAndNotify(voltageDate.value);
        }

        const currentDate = data['Current'];

        if (currentDate && this.currentProperty) {
            this.currentProperty.setCachedValueAndNotify(currentDate.value);
        }

        const powerDate = data['Power'];

        if (powerDate && this.powerProperty) {
            this.powerProperty.setCachedValueAndNotify(powerDate.value);
        }
    }
}
