'use strict';

const axios = require('axios');
const parser = require('node-html-parser');
const EventEmitter = require('events').EventEmitter;

class KomfoventC6 extends EventEmitter {
    constructor(username, password, ip) {
        super();

        this.username = username;
        this.password = password;
        this.url = `http://${ip}`;
        this.stop = false;
    }

    authenticate() {
        let params = new URLSearchParams();
        params.append(1, this.username);
        params.append(2, this.password);

        let config = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }

        return axios.post(this.url, params, config)
            .then((response) => {
                let root = parser.parse(response.data);
                let login = root.querySelector('#b_s');

                if(login !== null) {
                    console.log('login unsuccessful');
                }

                return !login;
            });
    }

    pullData1() {
        return this._pullData('/i.asp');
    }

    pullData2() {
        return this._pullData('/det.asp');
    }

    setControlMode(mode) {
        try {
            if (1 <= mode && mode <= 4) {
                return this._pushData("3=" + mode);
            }
        } catch (err) {
            console.log("unable to set control mode", err);
        }
    }

    setEcoMode() {
        try {
            return this._pushData("285=1")
                .then(this._forceUpdateOverviewScheduler.bind(this));
        } catch (err) {
            console.log("unable to set eco mode", err);
        }
    }

    setAutoMode() {
        try {
            return this._pushData("285=2")
                .then(this._forceUpdateOverviewScheduler.bind(this));
        } catch (err) {
            console.log("unable to set eco mode", err);
        }
    }

    startPullers() {
        // Pull dataset 1
        this._timeoutDataSet(this.pullData1.bind(this), 'DataSet1');

        // Pull dataset 2
        this._timeoutDataSet(this.pullData2.bind(this), 'DataSet2');
    }

    stopPullers() {
        this.stop = true;
    }

    _forceUpdateOverviewScheduler(){
        try {
            return this._pushData("286=2")
                .then(this._updateOverviewScheduler.bind(this));
        } catch (err) {
            console.log("unable to force update overview scheduler", err);
        }
    }

    _updateOverviewScheduler(){
        try {
            return this._pushData("286=0");
        } catch (err) {
            console.log("unable to update overview scheduler", err);
        }
    }

    _timeoutDataSet(pullMethod, set) {
        setTimeout(() => {
            if (this.stop) {
                return;
            }

            pullMethod()
                .then((data) => {
                    if (this.stop === false) {
                        this.emit(set, data);
                    }
                })
                .catch((err) => {
                    console.log('Could not pull ' + set, err);
                })
                .finally(() => {
                    this._timeoutDataSet(pullMethod, set);
                });
        }, 3500);
    }

    _pullData(page) {
        return axios.get(this.url + page)
            .then((response) => {
                return response.data;
            });
    }

    _pushData(text) {
        const config = {
            headers: {
                'Content-Type': 'text/plain'
            }
        };

        return axios.post(this.url + "/ajax.xml", text, config);
    }
}

module.exports = KomfoventC6;