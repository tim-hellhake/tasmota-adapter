/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Device } from 'gateway-addon';
import { debug } from './logger';
import { PollingProperty } from './polling-property';

export class WritableProperty<T> extends PollingProperty<T> {
    constructor(private device: Device, name: string, propertyDescr: {}, private set: (value: T) => Promise<void>, poll: () => Promise<void>) {
        super(device, name, propertyDescr, poll);
    }
    async setValue(value: T) {
        try {
            debug(`Set value of ${this.device.name} / ${this.title} to ${value}`);
            await super.setValue(value);
            this.set(value);
        }
        catch (e) {
            debug(`Could not set value: ${e}`);
        }
    }
}
