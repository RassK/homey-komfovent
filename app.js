'use strict';

const Homey = require('homey');
//require('inspector').open(9229, '0.0.0.0');

class KomfoventApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Komfovent app has been initialized');
  }
}

module.exports = KomfoventApp;