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
    constructor(device: Device, host: string, password: string) {
        super(device, 'on', {
            '@type': 'OnOffProperty',
            type: 'boolean',
            title: 'On',
            description: 'Whether the device is on or off'
        },
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
                const response = await getStatus(host, password, 'Power');
                const result = await response.json();
                this.update(result.POWER == 'ON');
            });
    }
}

class ColorProperty extends WritableProperty<string> {
    constructor(device: Device, host: string, password: string) {
        super(device, 'color', {
            '@type': 'ColorProperty',
            type: 'string',
            title: 'Color',
            description: 'The color of the light'
        },
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
                const response = await getStatus(host, password, 'Color');
                const result = await response.json();
                const color: string = result?.Color || "";
                const rgbColor = color.substring(0, 6);
                this.update(`#${rgbColor.toLowerCase()}`);
            });
    }
}

class BrightnessProperty extends WritableProperty<number> {
    constructor(device: Device, host: string, password: string) {
        super(device, 'brightness', {
            '@type': 'BrightnessProperty',
            type: 'integer',
            title: 'Brightness',
            description: 'The brightness of the light'
        },
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
                const response = await getStatus(host, password, 'Dimmer');
                const result = await response.json();
                this.update(result.Dimmer);
            });
    }
}

class ColorTemperatureProperty extends WritableProperty<number> {
    constructor(device: Device, host: string, password: string) {
        super(device, 'colorTemperature', {
            '@type': 'ColorTemperatureProperty',
            type: 'integer',
            title: 'Color Temperature',
            description: 'The color temperature of the light',
            minimum: 2700,
            maximum: 6500
        },
            async value => {
                // Convert from Kelvin to the Tasmota range of 153 - 500 before setting value
                const ctKelvin = Math.max(2700, Math.min(6500, value));
                const ctTasmota = Math.round((ctKelvin - 1025) / 10.95);
                const ctTasmota2 = 500 - ctTasmota + 153;
                const result = await setStatus(host, password, 'CT', <string><unknown>ctTasmota2);

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
                const response = await getStatus(host, password, 'CT');
                const result = await response.json();
                if (result) {
                    // Convert from the Tasmota range of 153 - 500 to Kelvin before updating value
                    const ctTasmota: number = ((500 - result?.CT) || 0) + 153;
                    const ctKelvin: number = Math.round(10.95 * ctTasmota + 1025);
                    this.update(ctKelvin);
                }
            });
    }
}

export class DimmableLight extends Device {
    private onOffProperty: OnOffProperty;
    private brightnessProperty: BrightnessProperty;

    constructor(adapter: Adapter, id: string, host: string, password: string) {
        super(adapter, id);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['Light'];
        this.name = id;

        const onOffProperty = new OnOffProperty(this, host, password);

        this.onOffProperty = onOffProperty;
        this.addProperty(onOffProperty);

        const brightnessProperty = new BrightnessProperty(this, host, password);

        this.brightnessProperty = brightnessProperty;
        this.addProperty(brightnessProperty);
    }

    addProperty(property: Property) {
        this.properties.set(property.name, property);
    }

    public startPolling(intervalMs: number) {
        this.onOffProperty.startPolling(intervalMs);
        this.brightnessProperty.startPolling(intervalMs);
    }
}

export class ColorTemperatureLight extends Device {
    private onOffProperty: OnOffProperty;
    private brightnessProperty: BrightnessProperty;
    private colorTemperatureProperty: ColorTemperatureProperty;

    constructor(adapter: Adapter, id: string, host: string, password: string) {
        super(adapter, id);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['Light'];
        this.name = id;

        const onOffProperty = new OnOffProperty(this, host, password);

        this.onOffProperty = onOffProperty;
        this.addProperty(onOffProperty);

        const brightnessProperty = new BrightnessProperty(this, host, password);

        this.brightnessProperty = brightnessProperty;
        this.addProperty(brightnessProperty);

        const colorTemperatureProperty = new ColorTemperatureProperty(this, host, password);

        this.colorTemperatureProperty = colorTemperatureProperty;
        this.addProperty(colorTemperatureProperty);
    }

    addProperty(property: Property) {
        this.properties.set(property.name, property);
    }

    public startPolling(intervalMs: number) {
        this.onOffProperty.startPolling(intervalMs);
        this.brightnessProperty.startPolling(intervalMs);
        this.colorTemperatureProperty.startPolling(intervalMs);
    }
}

export class ColorLight extends Device {
    private onOffProperty: OnOffProperty;
    private colorProperty: ColorProperty;
    //private brightnessProperty: BrightnessProperty;
    constructor(adapter: Adapter, id: string, host: string, password: string) {
        super(adapter, id);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['Light'];
        this.name = id;

        const onOffProperty = new OnOffProperty(this, host, password);

        this.onOffProperty = onOffProperty;
        this.addProperty(onOffProperty);

        const colorProperty = new ColorProperty(this, host, password);

        this.colorProperty = colorProperty;
        this.addProperty(colorProperty);

        //const brightnessProperty = new BrightnessProperty(this, host, password);

        //this.brightnessProperty = brightnessProperty;
        //this.addProperty(brightnessProperty);
    }

    addProperty(property: Property) {
        this.properties.set(property.name, property);
    }

    public startPolling(intervalMs: number) {
        this.onOffProperty.startPolling(intervalMs);
        this.colorProperty.startPolling(intervalMs);
        //this.brightnessProperty.startPolling(intervalMs);
    }
}
