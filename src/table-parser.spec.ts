/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { parse } from './table-parser';
import { expect } from 'chai';
import 'mocha';

describe('Table parser', () => {
    it('should not fail on empty strings', () => {
        const tableString = '';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(0, 'Result should be empty');
    });
});

describe('Table parser', () => {
    it('should not fail on random strings', () => {
        const tableString = 'sdfsdfdsf';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(0, 'Result should be empty');
    });
});

describe('Table parser', () => {
    it('should not fail on missing name', () => {
        const tableString = '{t}{s}{m}1 V{e}';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(0, 'Result should be empty');
    });
});

describe('Table parser', () => {
    it('symbol should be undefined if empty', () => {
        const tableString = '{t}{s}Voltage{m}1 {e}';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(1);
        expect(result['Voltage']?.value).to.equal(1);
        expect(result['Voltage']?.symbol).to.undefined;
    });
});

describe('Table parser', () => {
    it('value should be NaN if value is missing', () => {
        const tableString = '{t}{s}Voltage{m} V{e}';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(1, 'Result should be empty');
        expect(result['Voltage']?.value).to.NaN;
        expect(result['Voltage']?.symbol).to.undefined;
    });
});

describe('Table parser', () => {
    it('value should be NaN if value is invalid', () => {
        const tableString = '{t}{s}Voltage{m}a V{e}';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(1, 'Result should be empty');
        expect(result['Voltage']?.value).to.NaN;
        expect(result['Voltage']?.symbol).to.equal('V');
    });
});

describe('Table parser', () => {
    it('should parse multiple spaces correctly', () => {
        const tableString = '{t}  {s}  Voltage  {m}  1  V  {e}';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(1, 'Result should be empty');
        expect(result['Voltage']?.value).to.equal(1);
        expect(result['Voltage']?.symbol).to.equal('V');
    });
});

describe('Table parser', () => {
    it('should parse the table correctly', () => {
        const tableString = '{t}{s}Voltage{m}1 V{e}{s}Current{m}0.020 A{e}{s}Power{m}3 W{e}{s}Apparent Power{m}4 VA{e}{s}Reactive Power{m}5 VAr{e}{s}Power Factor{m}0.60{e}{s}Energy Today{m}0.070 kWh{e}{s}Energy Yesterday{m}0.080 kWh{e}{s}Energy Total{m}0.090 kWh{e}{t}ON';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(9);
        expect(result['Voltage']?.value).to.equal(1);
        expect(result['Voltage']?.symbol).to.equal('V');
        expect(result['Current']?.value).to.equal(0.02);
        expect(result['Current']?.symbol).to.equal('A');
        expect(result['Power']?.value).to.equal(3);
        expect(result['Power']?.symbol).to.equal('W');
        expect(result['Apparent Power']?.value).to.equal(4);
        expect(result['Apparent Power']?.symbol).to.equal('VA');
        expect(result['Reactive Power']?.value).to.equal(5);
        expect(result['Reactive Power']?.symbol).to.equal('VAr');
        expect(result['Power Factor']?.value).to.equal(0.6);
        expect(result['Power Factor']?.symbol).to.undefined;
        expect(result['Energy Today']?.value).to.equal(0.07);
        expect(result['Energy Today']?.symbol).to.equal('kWh');
        expect(result['Energy Yesterday']?.value).to.equal(0.08);
        expect(result['Energy Yesterday']?.symbol).to.equal('kWh');
        expect(result['Energy Total']?.value).to.equal(0.09);
        expect(result['Energy Total']?.symbol).to.equal('kWh');
    });
});
