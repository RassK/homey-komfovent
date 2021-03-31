'use strict';

const Homey = require('homey');
const KomfoventC6 = require('../../lib/komfoventC6');

class KomfoventDriver extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Komfovent driver has been initialized');
  }

  async onPair(session) {
    let device = null;

    session.setHandler('list_devices', async () => {
      // return devices when searching is done
      return [
        {
          name: 'Komfovent C6',
          data: {
            id: '192.168.1.60-komfovent-c6'
          },
          settings: {
            username: '',
            password: '',
            ip: '192.168.1.60'
          }
        }
      ];
    });

    session.setHandler('list_devices_selection', async (selectedDevices) => {
      device = selectedDevices[0];
    });

    session.setHandler('login', async (data) => {
      let komfovent = new KomfoventC6(data.username, data.password, device.settings.ip);
      const credentialsAreValid = await komfovent.authenticate();

      if (credentialsAreValid) {
        device.settings.username = data.username;
        device.settings.password = data.password;

        await session.nextView();
      }

      return false;
    });

    session.setHandler('add_device', async () => {
      return device;
    });
  }
}

module.exports = KomfoventDriver;