/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { Device } from 'gateway-addon';
import { getStatus } from './api';
import { PollingProperty } from './polling-property';

export class ColorModeProperty extends PollingProperty<'color' | 'temperature'> {
    constructor(device: Device, host: string, password: string) {
        super(device, 'colorMode', {
            '@type': 'ColorModeProperty',
            label: 'Color Mode',
            type: 'string',
            enum: [
                'color',
                'temperature',
            ],
            readOnly: true,
        }, async () => {
            const response = await getStatus(host, password, 'Color');
            const result = await response.json();
            const color: string = result.Color;
            const rgb = color.substring(0, 6);
            if (rgb != '000000') {
                this.update('color');
            }
            else {
                this.update('temperature');
            }
        });
    }
}
