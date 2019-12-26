/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { parse } from './table-parser';

export interface CommandResult {
    Command: string,
    WARNING: string
}

export function authConfig(password?: string) {
    return {
        headers: {
            'Authorization': `Basic ${Buffer.from(`admin:${password}`).toString('base64')}`
        }
    };
}

export async function getData(url: string, password?: string) {
    const response = await fetch(`http://${url}/?m=1`, authConfig(password));
    const stats = await response.text();
    return parse(stats);
}
