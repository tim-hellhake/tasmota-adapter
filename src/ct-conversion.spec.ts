/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { kelvinToTasmota, tasmotaToKelvin } from './ct-conversion';
import { expect } from 'chai';
import 'mocha';

describe('Kelvin to Tasmota', () => {
    it('500 in Tasmota range should translate to 2700 Kelvin', () => {
        const result = kelvinToTasmota(2700);
        expect(result).to.equal(500);
    });
});

describe('Kelvin to Tasmota', () => {
    it('153 in Tasmota range should translate to 6500 Kelvin', () => {
        const result = kelvinToTasmota(6500);
        expect(result).to.equal(153);
    });
});

describe('Tasmota to Kelvin', () => {
    it('2700 Kelvin should translate to 500 in Tasmota range', () => {
        const result = tasmotaToKelvin(500);
        expect(result).to.equal(2700);
    });
});

describe('Tasmota to Kelvin', () => {
    it('6500 Kelvin should translate to 153 in Tasmota range', () => {
        const result = tasmotaToKelvin(153);
        expect(result).to.equal(6500);
    });
});
