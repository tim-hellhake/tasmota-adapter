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

export class OnOffProperty extends WritableProperty<boolean> {
    constructor(device: Device, host: string, password: string) {
        super(device, 'on', {
            '@type': 'OnOffProperty',
            type: 'boolean',
            title: 'On',
            description: 'Whether the device is on or off'
        }, async (value) => {
            const status = value ? 'ON' : 'OFF';
            const result = await setStatus(host, password, 'Power', status);
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
            const response = await getStatus(host, password, 'Power');
            const result = await response.json();
            this.update(result.POWER == 'ON');
        });
    }
}
