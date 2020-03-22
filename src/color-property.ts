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

export class ColorProperty extends WritableProperty<string> {
    private channels: number;
    constructor(device: Device, host: string, password: string, manifest: any) {
        super(device, 'color', {
            '@type': 'ColorProperty',
            type: 'string',
            title: 'Color',
            description: 'The color of the light'
        },
            async value => {
                const {
                    experimental
                } = manifest.moziot.config;

                if (experimental?.useWhiteLedInColorMode) {
                    // If the color would be the same on all channels swap to the white channel.
                    const grey = '#' + value.substring(1, 3).repeat(3);

                    if (this.channels > 3 && value == grey) {
                        value = '#000000' + value.substring(1, 3);
                    }
                }

                const result = await setStatus(host, password, 'Color', value);

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
                const response = await getStatus(host, password, 'Color');
                const result = await response.json();
                const color: string = result?.Color || "";
                // Remember the number of channels for future checks.
                if (this.channels == 0) {
                    this.channels = color.length / 2;
                }
                var rgbColor = color.substring(0, 6);
                // If the color is black and there is a white channel display grey
                if (rgbColor == '000000' && color.length == 8) {
                    rgbColor = color.substring(6, 8).repeat(3);
                }
                this.update(`#${rgbColor.toLowerCase()}`);
            });
        this.channels = 0;
    }
}
