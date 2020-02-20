/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

export function kelvinToTasmota(value: number) {
    // Convert from Kelvin to the Tasmota range of 153 - 500 before setting value
    const ctKelvin = Math.max(2700, Math.min(6500, value));
    const ctTasmota = Math.round((ctKelvin - 1025) / 10.95);
    return 500 - ctTasmota + 153;
}

export function tasmotaToKelvin(value: number) {
    // Convert from the Tasmota range of 153 - 500 to Kelvin before updating value
    const ctTasmota: number = ((500 - value) || 0) + 153;
    const ctKelvin: number = Math.round(10.95 * ctTasmota + 1025);
    return ctKelvin;
}
