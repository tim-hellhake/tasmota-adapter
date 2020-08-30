/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property } from 'gateway-addon';
import { Data, findTemperatureProperty, findHumidityProperty, findDewPointProperty, findPressureProperty } from './table-parser';
import { CommandResult, getData, getStatus, setStatus } from './api';
import { debug, measureAsync } from './logger';

class MasterOnOffProperty extends Property {
    constructor(device: Device, private onOffProperties: Property[]) {
        super(device, 'on', {
            '@type': 'OnOffProperty',
            type: 'boolean',
            title: 'All',
            description: 'Turn all devices on or off'
        });
    }

    async setValue(value: boolean) {
        for (const onOffProperty of this.onOffProperties) {
            onOffProperty.setValue(value);
        }
    }

    check() {
        for (const onOffProperty of this.onOffProperties) {
            if (onOffProperty.value == true) {
                this.setCachedValueAndNotify(true);
                return;
            }
        }

        this.setCachedValueAndNotify(false);
    }
}

export class OnOffProperty extends Property {
    private lastState?: boolean;

    constructor(private device: Device, id: string, title: string, private host: string, private password: string, private channel: string, private master?: MasterOnOffProperty) {
        super(device, id, {
            '@type': 'OnOffProperty',
            type: 'boolean',
            title,
            description: 'Whether the device is on or off'
        });
    }

    async setValue(value: boolean) {
        try {
            debug(`Set value of ${this.device.name} / ${this.title} to ${value}`);
            await super.setValue(value);
            this.master?.check();
            const status = value ? 'ON' : 'OFF';
            const result = await measureAsync("setStatus", () =>
                setStatus(this.host, this.password, `Power${this.channel}`, status)
            );
            debug(``)

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
        const response = await measureAsync("getStatus", () =>
            getStatus(this.host, this.password, `Power${this.channel}`)
        );
        const result = await response.json();
        const value = result[`POWER${this.channel}`] == 'ON';

        if (this.lastState != value) {
            this.lastState = value;
            this.setCachedValueAndNotify(value);
            this.master?.check();
            debug(`Value of ${this.device.name} / ${this.title} changed to ${value}`);
        }
    }

    static async getAvailableChannels(host: string, password: string) {
        const channels: Channel[] = [];
        const friendlyNameResult = await OnOffProperty.getFriendlyNames(host, password);

        if (await OnOffProperty.isAvailable(host, password, '')) {
            debug('Main channel detected');
            const friendlyName = friendlyNameResult['FriendlyName1'];

            channels.push({
                id: '',
                friendlyName
            });
        } else {
            for (let i = 1; i < 10; i++) {
                if (await OnOffProperty.isAvailable(host, password, `${i}`)) {
                    const friendlyName = friendlyNameResult[`FriendlyName${i}`];

                    channels.push({
                        id: `${i}`,
                        friendlyName
                    });

                    debug(`Detected channel ${i} (${friendlyName})`);
                } else {
                    debug(`Channel ${i} not available`);
                }
            }
        }

        return channels;
    }

    static async getFriendlyNames(host: string, password: string) {
        const result = await getStatus(host, password, 'FriendlyName');
        const json = await result.json();
        return json;
    }

    static async isAvailable(host: string, password: string, channel: string) {
        const command = `POWER${channel}`;
        const result = await getStatus(host, password, command);
        const json = await result.json();
        const status = json[command];
        const available = status === 'ON' || status === 'OFF';

        return available;
    }
}

interface Channel {
    id: string,
    friendlyName: string | undefined
}

class TemperatureProperty extends Property {
    constructor(device: Device, public dataName: string, data: Data) {
        super(device, 'temperature', {
            '@type': 'TemperatureProperty',
            type: 'number',
            unit: data.symbol,
            multipleOf: 0.1,
            title: 'Temperature',
            readOnly: true
        });

        this.setCachedValueAndNotify(data.value);
    }
}

class HumidityProperty extends Property {
    constructor(device: Device, public dataName: string, data: Data) {
        super(device, 'humidity', {
            '@type': 'HumidityProperty',
            type: 'number',
            unit: data.symbol,
            multipleOf: 0.1,
            title: 'Humidity',
            readOnly: true
        });

        this.setCachedValueAndNotify(data.value);
    }
}

class DewPointProperty extends Property {
    constructor(device: Device, public dataName: string, data: Data) {
        super(device, 'dewPoint', {
            type: 'number',
            unit: data.symbol,
            multipleOf: 0.1,
            title: 'Dew point',
            readOnly: true
        });

        this.setCachedValueAndNotify(data.value);
    }
}

class PressureProperty extends Property {
    constructor(device: Device, public dataName: string, data: Data) {
        super(device, 'pressure', {
            type: 'number',
            unit: data.symbol,
            multipleOf: 0.1,
            title: 'Pressure',
            readOnly: true
        });

        this.setCachedValueAndNotify(data.value);
    }
}

export class PowerPlug extends Device {
    private onOffProperties: OnOffProperty[] = [];
    private voltageProperty?: Property;
    private powerProperty?: Property;
    private currentProperty?: Property;
    private apparentPowerProperty?: Property;
    private reactivePowerProperty?: Property;
    private powerFactorProperty?: Property;
    private energyTodayProperty?: Property;
    private energyYesterdayProperty?: Property;
    private energyTotalProperty?: Property;
    private temperatureProperty?: TemperatureProperty;
    private humidityProperty?: HumidityProperty;
    private dewPointProperty?: DewPointProperty;
    private pressureProperty?: PressureProperty;

    constructor(adapter: Adapter, id: string, manifest: any, private host: string, private password: string, data: { [name: string]: Data }, channels: Channel[], friendlyName: string | undefined) {
        super(adapter, id);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = [];
        this.name = id.replace('.local', '');

        const {
            experimental
        } = manifest.moziot.config;

        if (channels.length > 1) {
            this['@type'].push('SmartPlug');

            const masterOnOffProperty = new MasterOnOffProperty(this, this.onOffProperties);
            this.addProperty(masterOnOffProperty);

            for (const channel of channels) {
                const id = `on${channel.id}`;
                const name = channel.friendlyName || `Channel ${channel}`;
                debug(`Creating property for channel ${id} (${name})`);
                const onOffProperty = new OnOffProperty(this, id, name, host, password, `${channel.id}`, masterOnOffProperty);
                this.onOffProperties.push(onOffProperty);
                this.addProperty(onOffProperty);
            }
        } else {
            if (friendlyName) {
                this.name = `${friendlyName} (${this.name})`;
            }

            if (channels.length > 0) {
                this['@type'].push('SmartPlug');
                debug('Creating property for main channel');
                const onOffProperty = new OnOffProperty(this, 'on', 'On', host, password, '');
                this.onOffProperties.push(onOffProperty);
                this.addProperty(onOffProperty);
            } else {
                console.log('No main channel found, seems to be a sensor node');
            }
        }

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

        const apparentPower = data['Apparent Power'];

        if (apparentPower) {
            this.apparentPowerProperty = new Property(this, 'apparentPower', {
                type: 'number',
                unit: 'VA',
                title: 'Apparent Power',
                readOnly: true
            });

            this.addProperty(this.apparentPowerProperty);
        }

        const reactivePower = data['Reactive Power'];

        if (reactivePower) {
            this.reactivePowerProperty = new Property(this, 'reactivePower', {
                type: 'number',
                unit: 'VAr',
                title: 'Reactive Power',
                readOnly: true
            });

            this.addProperty(this.reactivePowerProperty);
        }

        const powerFactor = data['Power Factor'];

        if (powerFactor) {
            this.powerFactorProperty = new Property(this, 'powerFactor', {
                type: 'number',
                title: 'Power Factor',
                readOnly: true
            });

            this.addProperty(this.powerFactorProperty);
        }

        const energyToday = data['Energy Today'];

        if (energyToday) {
            this.energyTodayProperty = new Property(this, 'energyToday', {
                type: 'number',
                unit: 'kWh',
                title: 'Energy Today',
                readOnly: true
            });

            this.addProperty(this.energyTodayProperty);
        }

        const energyYesterday = data['Energy Yesterday'];

        if (energyYesterday) {
            this.energyYesterdayProperty = new Property(this, 'energyYesterday', {
                type: 'number',
                unit: 'kWh',
                title: 'Energy Yesterday',
                readOnly: true
            });

            this.addProperty(this.energyYesterdayProperty);
        }

        const energyTotal = data['Energy Total'];

        if (energyTotal) {
            this.energyTotalProperty = new Property(this, 'energyTotal', {
                type: 'number',
                unit: 'kWh',
                title: 'Energy Total',
                readOnly: true
            });

            this.addProperty(this.energyTotalProperty);
        }

        if (experimental?.temperatureSensor === true) {
            const temperatureData = findTemperatureProperty(data);

            if (temperatureData) {
                this.temperatureProperty = new TemperatureProperty(this, temperatureData.name, temperatureData.data);
                this.addProperty(this.temperatureProperty);
                this['@type'].push('TemperatureSensor');
            }
        }

        if (experimental?.temperatureSensor === true) {
            const humidityData = findHumidityProperty(data);

            if (humidityData) {
                this.humidityProperty = new HumidityProperty(this, humidityData.name, humidityData.data);
                this.addProperty(this.humidityProperty);
                this['@type'].push('HumiditySensor');
            }
        }

        if (experimental?.temperatureSensor === true) {
            const dewPoint = findDewPointProperty(data);

            if (dewPoint) {
                this.dewPointProperty = new DewPointProperty(this, dewPoint.name, dewPoint.data);
                this.addProperty(this.dewPointProperty);
            }
        }

        if (experimental?.temperatureSensor === true) {
            const pressure = findPressureProperty(data);

            if (pressure) {
                this.pressureProperty = new PressureProperty(this, pressure.name, pressure.data);
                this.addProperty(this.pressureProperty);
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
        for (const onOffProperty of this.onOffProperties) {
            onOffProperty.updateValue();
        }

        try {
            const data = await measureAsync("getStatus", () =>
                getData(this.host, this.password)
            );
            this.updatePowerProperties(data);
        } catch {
        }
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

        const apparentPower = data['Apparent Power'];

        if (apparentPower && this.apparentPowerProperty) {
            this.apparentPowerProperty.setCachedValueAndNotify(apparentPower.value);
        }

        const reactivePower = data['Reactive Power'];

        if (reactivePower && this.reactivePowerProperty) {
            this.reactivePowerProperty.setCachedValueAndNotify(reactivePower.value);
        }

        const powerFactor = data['Power Factor'];

        if (powerFactor && this.powerFactorProperty) {
            this.powerFactorProperty.setCachedValueAndNotify(powerFactor.value);
        }

        const energyToday = data['Energy Today'];

        if (energyToday && this.energyTodayProperty) {
            this.energyTodayProperty.setCachedValueAndNotify(energyToday.value);
        }

        const energyYesterday = data['Energy Yesterday'];

        if (energyYesterday && this.energyYesterdayProperty) {
            this.energyYesterdayProperty.setCachedValueAndNotify(energyYesterday.value);
        }

        const energyTotal = data['Energy Total'];

        if (energyTotal && this.energyTotalProperty) {
            this.energyTotalProperty.setCachedValueAndNotify(energyTotal.value);
        }

        if (this.temperatureProperty) {
            const temperatureData = data[this.temperatureProperty.dataName];
            this.temperatureProperty.setCachedValueAndNotify(temperatureData.value);
        }

        if (this.humidityProperty) {
            const humidityData = data[this.humidityProperty.dataName];
            this.humidityProperty.setCachedValueAndNotify(humidityData.value);
        }

        if (this.dewPointProperty) {
            const dewPointData = data[this.dewPointProperty.dataName];
            this.dewPointProperty.setCachedValueAndNotify(dewPointData.value);
        }

        if (this.pressureProperty) {
            const pressureData = data[this.pressureProperty.dataName];
            this.pressureProperty.setCachedValueAndNotify(pressureData.value);
        }
    }
}
