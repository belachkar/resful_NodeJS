const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

const config = require('./config');
const twilio = config.twilio;
const {
  isStringNotEmpty,
  isNumberPositif,
  isStringWithLength,
  isStringLengthBetweenStrict
} = require('../utils/utils');

const helpers = {};

helpers.hash = (str) => {
  if (isStringNotEmpty(str)) {
    const hash = crypto
      .createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');
    return hash;
  } else {
    return false;
  }
};

helpers.parseJsonToObject = (str) => {
  let obj = {};

  if (isStringNotEmpty(str) && str.trim().length > 2) {
    try {
      obj = JSON.parse(str.trim());
    } catch (e) {
      console.error(e);
    }
  }
  return obj;
};
helpers.createRandomString = (length) => {
  const strLength = isNumberPositif(length) ? length : false;
  if (strLength) {
    const Characters = '-abcdefghijklmnopqrstuvwxyz/0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_';
    let str = '';
    for (let i = 0; i < length; i++) {
      const randomCharacter = Characters.charAt(Math.floor((Math.random() * Characters.length)));
      str += randomCharacter;
    }
    return str;
  }
  return false;
};

// Send SMS messages via Twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
  // Validate parameters
  phone = isStringWithLength(phone, 10) ? phone.trim() : false;
  msg = isStringLengthBetweenStrict(msg, 0, 1601) ? msg.trim() : false;
  if (phone && msg) {
    // Configure the request payload
    const payload = {
      'from': twilio.fromPhone,
      'to': `+1${phone}`,
      'body': msg
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    // Configure the request details
    const requestDetails = {
      'protocol': 'https:',
      'hostname': 'api.twilio.com',
      'method': 'POST',
      'path': `/2010-04-01/Accounts/${twilio.accountSid}/Messages.json`,
      'auth': `${twilio.accountSid}:${twilio.authToken}`,
      'headers': {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload),
      },
    };

    //Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const status = res.statusCode;
      if (status == 200 || status == 201) {
        callback(false);
      } else {
        callback(`Status code returned was ${status}`);
      }
    });

    // Bind to the error event if it doesn\'t get thrown
    req.on('error', (e) => {
      callback(e);
    });
    req.write(stringPayload);
    req.end();
  } else {
    callback('Given parameters were missing or invalid');
  }
};

module.exports = helpers;
