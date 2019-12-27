/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import fetch from 'node-fetch';
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

export async function getData(host: string, password?: string) {
    const response = await fetch(`http://${host}/?m=1`, authConfig(password));
    const stats = await response.text();
    return parse(stats);
}

export async function getStatus(host: string, password: string, name: string) {
    return executeCommand(host, password, `${name}`);
}

export async function setStatus(host: string, password: string, name: string, status: string) {
    return executeCommand(host, password, `${name} ${status}`);
}

export async function executeCommand(host: string, password: string, command: string) {
    return fetch(`http://${host}/cm?user=admin&password=${encodeURIComponent(password)}&cmnd=${encodeURIComponent(command)}`, authConfig(password));
}
