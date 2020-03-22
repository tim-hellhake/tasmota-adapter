/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Device } from 'gateway-addon';
import { CommandResult, getStatus, setStatus } from './api';
import { kelvinToTasmota, tasmotaToKelvin } from './ct-conversion';
import { debug } from './logger';
import { WritableProperty } from './writable-property';

export class ColorTemperatureProperty extends WritableProperty<number> {
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
                const result = await setStatus(host, password, 'CT', `${kelvinToTasmota(value)}`);

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
            },
            async () => {
                const response = await getStatus(host, password, 'CT');
                const result = await response.json();
                if (result) {
                    this.update(tasmotaToKelvin(result?.CT));
                }
            });
    }
}
