/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

export function parse(s: string): { [name: string]: Data } {
    const regex = /\{s\}(.+?)\{e\}/g;
    const result: { [name: string]: Data } = {};

    let m;

    while (m = regex.exec(s)) {
        const match = m[1];

        if (match) {
            const [
                rawUnit,
                valueSymbol
            ] = match.split('{m}');

            const unit = rawUnit?.trim();

            if (unit && valueSymbol) {
                result[unit] = parseData(valueSymbol);
            }
        }
    }

    return result;
}

function parseData(valueSymbol: string): Data {
    const regex = /([+-]?(\d*\.)?\d+)(.*)/;

    const [
        ,
        rawValue,
        ,
        rawSymbol
    ] = regex.exec(valueSymbol) || [];

    let symbol: string | undefined = rawSymbol?.trim();

    if (symbol == '') {
        symbol = undefined;
    }

    symbol = symbol?.replace('&deg;', '°')

    return {
        value: parseFloat(rawValue),
        symbol
    }
}

export function findTemperatureProperty(properties: { [name: string]: Data }): { name: string, data: Data } | undefined {
    for (let [name, data] of Object.entries(properties)) {
        if (data.symbol == '°C') {
            return {
                name,
                data
            }
        }
    }

    return undefined;
}

export function findTemperatureProperties(properties: { [name: string]: Data }): { [name: string]: Data } {
    const result: { [name: string]: Data } = {}

    for (let [key, value] of Object.entries(properties)) {
        if (value.symbol == '°C') {
            result[key] = value;
        }
    }

    return result;
}

export interface Data {
    value: number,
    symbol?: string,
}
