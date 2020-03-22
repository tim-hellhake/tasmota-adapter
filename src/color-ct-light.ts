/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Property } from 'gateway-addon';
import { ColorLight } from './color-light';
import { ColorModeProperty } from './color-mode-property';
import { ColorTemperatureProperty } from './color-temperature-property';

export class ColorCtLight extends ColorLight {
    private colorTemperatureProperty: ColorTemperatureProperty;
    private colorModeProperty: ColorModeProperty;
    constructor(adapter: Adapter, id: string, host: string, password: string, manifest: any) {
        super(adapter, id, host, password, manifest);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['Light'];
        this.name = id;
        this.colorTemperatureProperty = new ColorTemperatureProperty(this, host, password);
        this.addProperty(this.colorTemperatureProperty);
        this.colorModeProperty = new ColorModeProperty(this, host, password);
        this.addProperty(this.colorModeProperty);
    }
    addProperty(property: Property) {
        this.properties.set(property.name, property);
    }
    public startPolling(intervalMs: number) {
        super.startPolling(intervalMs);
        this.colorTemperatureProperty.startPolling(intervalMs);
        this.colorModeProperty.startPolling(intervalMs);
    }
}
