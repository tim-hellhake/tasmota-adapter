/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property } from 'gateway-addon';
import { CommandResult, getStatus, setStatus } from './api';

class WritableProperty<T> extends Property {
    constructor(private device: Device, name: string, propertyDescr: {}, private set: (value: T) => Promise<void>, private poll: () => Promise<void>) {
        super(device, name, propertyDescr);
    }

    async setValue(value: T) {
        try {
            console.log(`Set value of ${this.device.name} / ${this.title} to ${value}`);
            await super.setValue(value);
            this.set(value);
        } catch (e) {
            console.log(`Could not set value: ${e}`);
        }
    }

    update(value: T) {
        this.setCachedValueAndNotify(value);
    }

    public startPolling(intervalMs: number) {
        setInterval(() => this.poll(), intervalMs);
    }
}

class OnOffProperty extends WritableProperty<boolean> {
    constructor(device: Device, set: (value: boolean) => Promise<void>, poll: () => Promise<void>) {
        super(device, 'on', {
            '@type': 'OnOffProperty',
            type: 'boolean',
            title: 'On',
            description: 'Whether the device is on or off'
        }, set, poll);
    }
}

class ColorProperty extends WritableProperty<string> {
    constructor(device: Device, set: (value: string) => Promise<void>, poll: () => Promise<void>) {
        super(device, 'color', {
            '@type': 'ColorProperty',
            type: 'string',
            title: 'Color',
            description: 'The color of the light'
        }, set, poll);
    }
}

class BrightnessProperty extends WritableProperty<number> {
    constructor(device: Device, set: (value: number) => Promise<void>, poll: () => Promise<void>) {
        super(device, 'brightness', {
            '@type': 'BrightnessProperty',
            type: 'integer',
            title: 'Brightness',
            description: 'The brightness of the light'
        }, set, poll);
    }
}

class ColorTemperatureProperty extends WritableProperty<number> {
    constructor(device: Device, set: (value: number) => Promise<void>, poll: () => Promise<void>) {
        super(device, 'on', {
            '@type': 'ColorTemperatureProperty',
            type: 'number',
            title: 'On',
            description: 'Color temperature of the light'
        }, set, poll);
    }
}

export class Light extends Device {
    private onOffProperty: OnOffProperty;
    private colorProperty: ColorProperty;
    private colorTemperatureProperty: ColorTemperatureProperty;
    //private brightnessProperty: BrightnessProperty;
    constructor(adapter: Adapter, id: string, private host: string, private password: string) {
        super(adapter, id);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['Light'];
        this.name = id;

        const onOffProperty = new OnOffProperty(this,
            async value => {
                const status = value ? 'ON' : 'OFF';
                const result = await setStatus(host, password, 'Power', status);

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
            },
            async () => {
                const response = await getStatus(this.host, this.password, 'Power');
                const result = await response.json();
                onOffProperty.update(result.POWER == 'ON');
            });

        this.onOffProperty = onOffProperty;
        this.addProperty(onOffProperty);

        const colorProperty = new ColorProperty(this,
            async value => {
                const result = await setStatus(host, password, 'Color', value);

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
            },
            async () => {
                const response = await getStatus(this.host, this.password, 'Color');
                const result = await response.json();
                const color: string = result?.Color || "";
                const rgbColor = color.substring(0, 6);
                colorProperty.update(`#${rgbColor.toLowerCase()}`);
            });

        this.colorProperty = colorProperty;
        this.addProperty(colorProperty);

        const brightnessProperty = new BrightnessProperty(this,
            async value => {
                const result = await setStatus(host, password, 'Dimmer', <string><unknown>value);

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
            },
            async () => {
                const response = await getStatus(this.host, this.password, 'Dimmer');
                const result = await response.json();
                brightnessProperty.update(result.Dimmer);
            });

        //this.brightnessProperty = brightnessProperty;
        //this.addProperty(brightnessProperty);

        const colorTemperatureProperty = new ColorTemperatureProperty(this,
            async value => {
                var ctTasmota = (value-102.500)/10.95;
                if(value != 0)
                {
                    console.log(`CT Kelvin: ${value}, Tasmota: ${ctTasmota}`);
                }
                const result = await setStatus(host, password, 'CT', `#${ctTasmota}`);

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
            },
            async () => {
                //const wiensDisplacement=2898000;
                const response = await getStatus(this.host, this.password, 'CT');
                const result = await response.json();
                const ctTasmota: number = result?.CT || 0;
                const ctKelvin: number = 10.95*ctTasmota+102.500;
                if(ctTasmota != 0)
                {
                    console.log(`CT Tasmota: ${ctTasmota}, Kelvin: ${ctKelvin}`);
                    colorTemperatureProperty.update(ctKelvin);
                }
            });

        this.colorTemperatureProperty = colorTemperatureProperty;
        this.addProperty(colorTemperatureProperty);
    }

    addProperty(property: Property) {
        this.properties.set(property.name, property);
    }

    public startPolling(intervalMs: number) {
        this.onOffProperty.startPolling(intervalMs);
        this.colorProperty.startPolling(intervalMs);
        //this.brightnessProperty.startPolling(intervalMs);
        this.colorTemperatureProperty.startPolling(intervalMs);
    }
}
