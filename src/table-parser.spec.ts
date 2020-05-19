/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.*
 */

'use strict';

import { parse, findTemperatureProperties, findTemperatureProperty, findHumidityProperties, findHumidityProperty } from './table-parser';
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
        expect(result['Voltage']?.symbol).to.undefined;
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

describe('Table parser', () => {
    it('should parse the table correctly', () => {
        const tableString = '{t}{s}Voltage{m}229 V{e}{s}Current{m}0.516 A{e}{s}Power{m}75 W{e}{s}Apparent Power{m}118 VA{e}{s}Reactive Power{m}91 VAr{e}{s}Power Factor{m}0.63{e}{s}Energy Today{m}0.445 kWh{e}{s}Energy Yesterday{m}0.870 kWh{e}{s}Energy Total{m}12.386 kWh{e}{t}ON';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(9);
        expect(result['Voltage']?.value).to.equal(229);
        expect(result['Voltage']?.symbol).to.equal('V');
        expect(result['Current']?.value).to.equal(0.516);
        expect(result['Current']?.symbol).to.equal('A');
        expect(result['Power']?.value).to.equal(75);
        expect(result['Power']?.symbol).to.equal('W');
        expect(result['Apparent Power']?.value).to.equal(118);
        expect(result['Apparent Power']?.symbol).to.equal('VA');
        expect(result['Reactive Power']?.value).to.equal(91);
        expect(result['Reactive Power']?.symbol).to.equal('VAr');
        expect(result['Power Factor']?.value).to.equal(0.63);
        expect(result['Power Factor']?.symbol).to.undefined;
        expect(result['Energy Today']?.value).to.equal(0.445);
        expect(result['Energy Today']?.symbol).to.equal('kWh');
        expect(result['Energy Yesterday']?.value).to.equal(0.870);
        expect(result['Energy Yesterday']?.symbol).to.equal('kWh');
        expect(result['Energy Total']?.value).to.equal(12.386);
        expect(result['Energy Total']?.symbol).to.equal('kWh');
    });
});

describe('Table parser', () => {
    it('should parse the table correctly', () => {
        const tableString = '{t}{s}DS18B20 Temperatur{m}25.8°C{e}{t}OFFOFFOFFOFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(1);
        expect(result['DS18B20 Temperatur']?.value).to.equal(25.8);
        expect(result['DS18B20 Temperatur']?.symbol).to.equal('°C');
    });
});

describe('Table parser', () => {
    it('should parse the table correctly', () => {
        const tableString = '{t}{s}DS18B20 Temperatur{m}-25.8°C{e}{t}OFFOFFOFFOFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(1);
        expect(result['DS18B20 Temperatur']?.value).to.equal(-25.8);
        expect(result['DS18B20 Temperatur']?.symbol).to.equal('°C');
    });
});

describe('Table parser', () => {
    it('should parse the table correctly', () => {
        const tableString = '{t}{s}DS18B20 Temperatur{m}+25.8°C{e}{t}OFFOFFOFFOFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(1);
        expect(result['DS18B20 Temperatur']?.value).to.equal(25.8);
        expect(result['DS18B20 Temperatur']?.symbol).to.equal('°C');
    });
});

describe('Table parser', () => {
    it('should parse the table correctly', () => {
        const tableString = '{t}{s}DS18B20 Temperatur{m}+25.8&deg;C{e}{t}OFFOFFOFFOFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(1);
        expect(result['DS18B20 Temperatur']?.value).to.equal(25.8);
        expect(result['DS18B20 Temperatur']?.symbol).to.equal('°C');
    });
});

describe('Table parser', () => {
    it('should find first temperature property', () => {
        const tableString = '{t}{s}Voltage{m}229 V{e}{s}DS18B20 Temperatur{m}+25.8°C{e}{s}Sun{m}-1.8°C{e}{t}OFFOFFOFFOFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(3);
        const temperatureProperty = findTemperatureProperty(result);
        expect(temperatureProperty).to.not.undefined;
        expect(temperatureProperty?.name).to.equal('DS18B20 Temperatur');
        expect(temperatureProperty?.data?.value).to.equal(25.8);
        expect(temperatureProperty?.data?.symbol).to.equal('°C');
    });
});

describe('Table parser', () => {
    it('should find first temperature property with escaped html chars', () => {
        const tableString = '{t}{s}Voltage{m}229 V{e}{s}DS18B20 Temperatur{m}+25.8&deg;C{e}{s}Sun{m}-1.8°C{e}{t}OFFOFFOFFOFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(3);
        const temperatureProperty = findTemperatureProperty(result);
        expect(temperatureProperty).to.not.undefined;
        expect(temperatureProperty?.name).to.equal('DS18B20 Temperatur');
        expect(temperatureProperty?.data?.value).to.equal(25.8);
        expect(temperatureProperty?.data?.symbol).to.equal('°C');
    });
});

describe('Table parser', () => {
    it('should find all temperature properties', () => {
        const tableString = '{t}{s}Voltage{m}229 V{e}{s}DS18B20 Temperatur{m}+25.8°C{e}{s}Sun{m}-1.8°C{e}{t}OFFOFFOFFOFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(3);
        const temperatureResults = findTemperatureProperties(result);
        expect(Object.keys(temperatureResults)).to.have.length(2);
        expect(temperatureResults['DS18B20 Temperatur']?.value).to.equal(25.8);
        expect(temperatureResults['DS18B20 Temperatur']?.symbol).to.equal('°C');
        expect(temperatureResults['Sun']?.value).to.equal(-1.8);
        expect(temperatureResults['Sun']?.symbol).to.equal('°C');
    });
});

describe('Table parser', () => {
    it('should parse temperature and Humidity correctly', () => {
        const tableString = '{t}{s}SI7021 Temperature{m}23.9°C{e}{s}SI7021 Humidity{m}43.2%{e}{t}OFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(2);
        expect(result['SI7021 Temperature']?.value).to.equal(23.9);
        expect(result['SI7021 Temperature']?.symbol).to.equal('°C');
        expect(result['SI7021 Humidity']?.value).to.equal(43.2);
        expect(result['SI7021 Humidity']?.symbol).to.equal('%');
    });
});

describe('Table parser', () => {
    it('should find first temperature property with escaped html chars', () => {
        const tableString = '{t}{s}SI7021 Temperature{m}23.9°C{e}{s}SI7021 Humidity{m}43.2%{e}{s}Bath{m}34.5%{e}{t}OFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(3);
        const temperatureProperty = findHumidityProperty(result);
        expect(temperatureProperty).to.not.undefined;
        expect(temperatureProperty?.name).to.equal('SI7021 Humidity');
        expect(temperatureProperty?.data?.value).to.equal(43.2);
        expect(temperatureProperty?.data?.symbol).to.equal('%');
    });
});

describe('Table parser', () => {
    it('should find all humidity properties', () => {
        const tableString = '{t}{s}SI7021 Temperature{m}23.9°C{e}{s}SI7021 Humidity{m}43.2%{e}{s}Bath{m}34.5%{e}{t}OFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(3);
        const humidityResults = findHumidityProperties(result);
        expect(Object.keys(humidityResults)).to.have.length(2);
        expect(result['SI7021 Humidity']?.value).to.equal(43.2);
        expect(result['SI7021 Humidity']?.symbol).to.equal('%');
        expect(result['Bath']?.value).to.equal(34.5);
        expect(result['Bath']?.symbol).to.equal('%');
    });
});

describe('Table parser', () => {
    it('should parse dew point and pressure correctly', () => {
        const tableString = '{t}{s}BME280 Dew point{m}9.7°C{e}{s}BME280 Pressure{m}987.9hPa{e}{t}OFF';
        const result = parse(tableString);
        expect(Object.keys(result)).to.have.length(2);
        expect(result['BME280 Dew point']?.value).to.equal(9.7);
        expect(result['BME280 Dew point']?.symbol).to.equal('°C');
        expect(result['BME280 Pressure']?.value).to.equal(987.9);
        expect(result['BME280 Pressure']?.symbol).to.equal('hPa');
    });
});
