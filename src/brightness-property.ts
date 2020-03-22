/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Device } from 'gateway-addon';
import { CommandResult, getStatus, setStatus } from './api';
import { debug } from './logger';
import { WritableProperty } from './writable-property';

export class BrightnessProperty extends WritableProperty<number> {
    constructor(device: Device, host: string, password: string) {
        super(device, 'brightness', {
            '@type': 'BrightnessProperty',
            type: 'integer',
            title: 'Brightness',
            description: 'The brightness of the light'
        }, async (value) => {
            const result = await setStatus(host, password, 'Dimmer', `${value}`);
            if (result.status != 200) {
                debug(`Could not set status: ${result.statusText} (${result.status})`);
            }
            else {
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
        }, async () => {
            const response = await getStatus(host, password, 'Dimmer');
            const result = await response.json();
            this.update(result.Dimmer);
        });
    }
}
