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
                const [
                    rawValue,
                    rawSymbol
                ] = valueSymbol.split(' ').filter(s => s.length > 0);

                let symbol: string | undefined = rawSymbol?.trim();

                if (symbol == '') {
                    symbol = undefined;
                }

                result[unit] = {
                    value: parseFloat(rawValue),
                    symbol
                }
            }
        }
    }

    return result;
}

export interface Data {
    value: number,
    symbol?: string,
}
