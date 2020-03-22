/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Property } from 'gateway-addon';
import { DimmableLight } from './dimmable-light';
import { ColorTemperatureProperty } from './color-temperature-property';

export class ColorTemperatureLight extends DimmableLight {
    private colorTemperatureProperty: ColorTemperatureProperty;
    constructor(adapter: Adapter, id: string, host: string, password: string) {
        super(adapter, id, host, password);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['Light'];
        this.name = id;
        this.colorTemperatureProperty = new ColorTemperatureProperty(this, host, password);
        this.addProperty(this.colorTemperatureProperty);
    }
    addProperty(property: Property) {
        this.properties.set(property.name, property);
    }
    public startPolling(intervalMs: number) {
        super.startPolling(intervalMs);
        this.colorTemperatureProperty.startPolling(intervalMs);
    }
}
