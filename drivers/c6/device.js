'use strict';

const Homey = require('homey');
const parser = require('fast-xml-parser');
const isIp = require('is-ip');
const KomfoventC6 = require('../../lib/komfoventC6');

class KomfoventDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.login();
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Komfocent C6 has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Komfocent C6 settings where changed');

    if (this.komfovent) {
      this.komfovent.stopPullers();
    }

    this.login();
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('Komfocent C6 was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Komfocent C6 has been deleted');

    if (this.komfovent) {
      this.komfovent.stopPullers();
    }
  }

  login() {
    const settings = this.getSettings();

    let ip = settings.ip;
    let username = settings.username;
    let password = settings.password;

    if (isIp(ip)) {
      this.log('Komfocent C6 has been initialized', { ip, username });

      this.komfovent = new KomfoventC6(username, password, ip);
      this.komfovent.authenticate().then((result) => {
        if (result) {
          this.initDataFlow();
        }
      });
    } else {
      this.log('IP is not set or valid');
    }
  }

  initDataFlow() {
    this.log('login success, starting pullers');

    this.komfovent.startPullers();
    this.komfovent.on('DataSet1', this.processDataSet1.bind(this));
    this.komfovent.on('DataSet2', this.processDataSet2.bind(this));

    this.registerCapabilityListener('vent_mode', async (value) => {
      this.komfovent.setControlMode(value);
    });

    this.registerCapabilityListener('eco_mode', async (value) => {
      this.komfovent.setEcoMode();
    });

    this.registerCapabilityListener('auto_mode', async (value) => {
      this.komfovent.setAutoMode();
    });
  }

  processDataSet1(data) {
    try {
      if (!this._isValidXml(data)) {
        return;
      }

      let options = {};
      let jsonObj = parser.parse(data, options);

      let tempOut = this._getFloat(jsonObj.A.AI2);
      let powerCurrent = this._getFloat(jsonObj.A.EC3);
      let powerMonth = this._getFloat(jsonObj.A.EC6M);
      let controlMod = (jsonObj.A.VF >> 13 & 15).toString();
      let ecoMod = (jsonObj.A.VF >> 22 & 1) == 1;
      let autoMod = (jsonObj.A.VF >> 23 & 1) == 1;
      let filterClog = this._getInt(jsonObj.A.FCG);

      this.setCapabilityValue('vent_mode', controlMod);
      this.setCapabilityValue('eco_mode', ecoMod);
      this.setCapabilityValue('auto_mode', autoMod);
      this.setCapabilityValue('filter_clog', filterClog);
      this.setCapabilityValue('meter_power', powerMonth);
      this.setCapabilityValue('measure_power', powerCurrent);
      this.setCapabilityValue('measure_temperature.outside', tempOut);

    } catch (err) {
      this.log("Could not parse dataset 1", { err, data });
    }
  }

  processDataSet2(data) {
    try {
      if (!this._isValidXml(data)) {
        return;
      }

      let options = {};
      let jsonObj = parser.parse(data, options);

      let tempPanel = this._getFloat(jsonObj.V.PT1);
      let humPanel = this._getFloat(jsonObj.V.PH1);

      this.setCapabilityValue('measure_temperature.panel', tempPanel);
      this.setCapabilityValue('measure_humidity.panel', humPanel);

    } catch (err) {
      this.log("Could not parse dataset 2", { err, data });
    }
  }

  _getInt(value) {
    return parseInt(value.replace(/[^0-9]+/, ''));
  }

  _getFloat(value) {
    return parseFloat(value.replace(/[^0-9.]+/, ''));
  }

  _isValidXml(data) {
    let isValid = parser.validate(data);

    if (isValid !== true) {
      this.log("invalid xml", data);
    }

    return isValid;
  }

}

module.exports = KomfoventDevice;
