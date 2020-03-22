/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Property } from 'gateway-addon';
import { DimmableLight } from './dimmable-light';
import { ColorProperty } from './color-property';

export class ColorLight extends DimmableLight {
    private colorProperty: ColorProperty;
    constructor(adapter: Adapter, id: string, host: string, password: string, manifest: any) {
        super(adapter, id, host, password);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['Light'];
        this.name = id;
        this.colorProperty = new ColorProperty(this, host, password, manifest);
        this.addProperty(this.colorProperty);
    }
    addProperty(property: Property) {
        this.properties.set(property.name, property);
    }
    public startPolling(intervalMs: number) {
        super.startPolling(intervalMs);
        this.colorProperty.startPolling(intervalMs);
    }
}
