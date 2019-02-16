// const fs = require('fs');
// const path = require('path');
const https = require('https');
const http = require('http');
const url = require('url');

const _data = require('./data');
const { sendTwilioSms } = require('./helpers');
const {
  isArrayNotEmpty,
  isObject,
  isStringNotEmpty,
  isStringWithLength,
  isNumberNatural
} = require('../utils/utils');
const { maxTimeoutChecks } = require('./config');

const workers = {};

const loop = () => {
  setInterval(() => {
    gatherAllChecks();
  }, 1000 * 60);
};

const gatherAllChecks = () => {
  _data.list('checks', (err, checks) => {
    if (!err && isArrayNotEmpty(checks)) {
      checks.forEach(check => {
        _data.read('checks', check, (err, orgCheckData) => {
          if(!err && orgCheckData) {
            validateCheckData(orgCheckData);
          } else {
            console.error(`Error: Reading one of the check's data ${check}`);
          }
        });
      });
    } else {
      console.error('Error: Could not find any checks to process');
    }
  });
};

const validateCheckData = (orgCheckData) => {
  if (isObject(orgCheckData)) {
    let {
      id,
      userPhone,
      protocol,
      url,
      method,
      successCodes,
      timeoutSeconds,
      state,
      lastChecked
    } = orgCheckData;
    const protocols = ['http', 'https'];
    const methods = ['post', 'get', 'put', 'delete'];
    const states = ['up', 'down'];

    id = isStringWithLength(id, 20) ? id.trim() : false;
    userPhone = isStringWithLength(userPhone, 10) ? userPhone.trim() : false;
    protocol = isStringNotEmpty(protocol) && protocols.includes(protocol) ? protocol : false;
    url = isStringNotEmpty(url) ? url.trim() : false;
    method = isStringNotEmpty(method) && methods.includes(method) ? method : false;
    successCodes = isArrayNotEmpty(successCodes) ? successCodes : false;
    timeoutSeconds = isNumberNatural(timeoutSeconds) && timeoutSeconds <= maxTimeoutChecks ?
      timeoutSeconds :
      maxTimeoutChecks;
    state = isStringNotEmpty(state) && states.includes(state) ? state : 'down';
    lastChecked = isNumberNatural(lastChecked) ? lastChecked : false;
    if (id && userPhone && protocol && url && method && successCodes && timeoutSeconds ) {
      const checkdata = {
        id,
        userPhone,
        protocol,
        url,
        method,
        successCodes,
        timeoutSeconds,
        state,
        lastChecked
      };
      Object.assign(orgCheckData, checkdata);
      performCheck(orgCheckData);
    } else {
      console.error('Error: One of the checks is not properly formatted. Skipping it.');
    }
  } else {
    console.error('Error: checked data is not an object.');
  }

};

const performCheck = (orgCheckData) => {
  const { protocol, method, timeoutSeconds } = orgCheckData;
  let checkOutcome = {
    'error': null,
    'responseCode': null,
  };
  let outcomeSent = false;
  const parsedUrl = url.parse(`${protocol}://${orgCheckData.url}`, true);
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path;

  const requestDetails = {
    'protocol': `${protocol}:`,
    hostname,
    'method': `${method.toUpperCase()}`,
    path,
    'timeout': timeoutSeconds * 1000,
  };
  // console.log(requestDetails);
  const _moduleToUse = protocol == 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    console.log(res.statusCode);
    const status = res.statusCode;
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      processCheckOutcome(orgCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('error', (err) => {
    checkOutcome.error = {
      'error': true,
      'value': err
    };
    if (!outcomeSent) {
      processCheckOutcome(orgCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('timeout', () => {
    checkOutcome.error = {
      'error': true,
      'value': 'Timeout',
    };
    if (!outcomeSent) {
      processCheckOutcome(orgCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.end();
};

// Process the check outcome, update the check data es needed, trigger an alert to the user
// Special topic for accomoding a check that has never perfomed before (don't alert on that one)
const processCheckOutcome = (orgCheckData, checkOutcome) => {
  console.log(checkOutcome);
  const { error, responseCode } = checkOutcome;
  const { successCodes, lastChecked } = orgCheckData;
  const state = !error && responseCode && successCodes.includes(responseCode) ? 'up' : 'down';

  const alertWarranted = lastChecked && orgCheckData.state !== state ? true : false;

  // Update the check data
  const newCheckData = orgCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  // Save the updates
  _data.update('checks', newCheckData.id, newCheckData, (err) => {
    if (!err) {
      // Send the new check datta to next phase in the process if needed
      if (alertWarranted) {
        alertUserToStatusChanged(newCheckData);
      } else {
        console.error('Check outcome has not changed, no alert needed');
      }
    } else {
      console.error('Error trying to save updates to one of the checks');
    }
  });
};

const alertUserToStatusChanged = (newCheckData) => {
  const { method, protocol, url, state, userPhone } = newCheckData;
  const msg = `Alert: Your check for ${method.toUpperCase()} ${protocol}://${url}
    is currently ${state}`;
  sendTwilioSms(userPhone, msg, (err) => {
    if (!err) {
      console.log(`Success: User was alerted to a change in their check, via sms: ${msg}`);
    } else {
      console.error(`Error: Could not send sms alert
        to the user who had a state changed in their check`);
    }
  });
};

workers.init = () => {
  // Execute all the chacks immadiately;
  gatherAllChecks();
  // Call the loop so the checks will execute later on
  loop();
};

module.exports = workers;
