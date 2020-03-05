/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property } from 'gateway-addon';
import { Data, findTemperatureProperty } from './table-parser';
import { CommandResult, getData, getStatus, setStatus } from './api';
import { debug } from './logger';

class OnOffProperty extends Property {
    private lastState?: boolean;

    constructor(private device: Device, private host: string, private password: string, private channel: string) {
        super(device, 'on', {
            '@type': 'OnOffProperty',
            type: 'boolean',
            title: 'On',
            description: 'Whether the device is on or off'
        });
    }

    async setValue(value: boolean) {
        try {
            debug(`Set value of ${this.device.name} / ${this.title} to ${value}`);
            await super.setValue(value);
            const status = value ? 'ON' : 'OFF';
            const result = await setStatus(this.host, this.password, `Power${this.channel}`, status);

            if (result.status != 200) {
                debug(`Could not set status: ${result.statusText} (${result.status})`);
            } else {
                const json: CommandResult = await result.json();

                if (json.WARNING) {
                    if (json.WARNING) {
                        debug(`Could not set status: ${json.WARNING}`);
                    }

                    if (json.Command) {
                        debug(`Could not set status: ${json.Command}`);
                    }
                }
            }
        } catch (e) {
            debug(`Could not set value: ${e}`);
        }
    }

    async updateValue() {
        const response = await getStatus(this.host, this.password, 'Power');
        const result = await response.json();
        const value = result.POWER == 'ON';

        if (this.lastState != value) {
            this.lastState = value;
            this.setCachedValueAndNotify(value);
            debug(`Value of ${this.device.name} / ${this.title} changed to ${value}`);
        }
    }
}

class TemperatureProperty extends Property {
    constructor(device: Device, public dataName: string, data: Data) {
        super(device, 'temperature', {
            '@type': 'TemperatureProperty',
            type: 'number',
            unit: data.symbol,
            multipleOf: 0.1,
            title: 'Temperature'
        });

        this.setCachedValueAndNotify(data.value);
    }
}

export class PowerPlug extends Device {
    private onOffProperty: OnOffProperty;
    private voltageProperty?: Property;
    private powerProperty?: Property;
    private currentProperty?: Property;
    private temperatureProperty?: TemperatureProperty;

    constructor(adapter: Adapter, id: string, manifest: any, private host: string, password: string, data: { [name: string]: Data }) {
        super(adapter, id);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['SmartPlug', 'TemperatureSensor'];
        this.name = id;

        this.onOffProperty = new OnOffProperty(this, host, password, '0');

        this.addProperty(this.onOffProperty);

        debug(`Parsed data: ${JSON.stringify(data)}`);

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

        const {
            experimental
        } = manifest.moziot.config;

        if (experimental?.temperatureSensor === true) {
            const temperatureData = findTemperatureProperty(data);

            if (temperatureData) {
                this.temperatureProperty = new TemperatureProperty(this, temperatureData.name, temperatureData.data);
                this.addProperty(this.temperatureProperty);
            }
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
        this.onOffProperty.updateValue();

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

        if (this.temperatureProperty) {
            const temperatureData = data[this.temperatureProperty.dataName];
            this.temperatureProperty.setCachedValueAndNotify(temperatureData.value);
        }
    }
}
