/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Adapter, Device, Property } from 'gateway-addon';
import { OnOffProperty } from './on-off-roperty';
import { BrightnessProperty } from './brightness-property';

export class DimmableLight extends Device {
    private onOffProperty: OnOffProperty;
    private brightnessProperty: BrightnessProperty;
    constructor(adapter: Adapter, id: string, host: string, password: string) {
        super(adapter, id);
        this['@context'] = 'https://iot.mozilla.org/schemas/';
        this['@type'] = ['Light'];
        this.name = id;
        this.onOffProperty = new OnOffProperty(this, host, password);
        this.addProperty(this.onOffProperty);
        this.brightnessProperty = new BrightnessProperty(this, host, password);
        this.addProperty(this.brightnessProperty);
    }
    addProperty(property: Property) {
        this.properties.set(property.name, property);
    }
    public startPolling(intervalMs: number) {
        this.onOffProperty.startPolling(intervalMs);
        this.brightnessProperty.startPolling(intervalMs);
    }
}
