const crypto = require('crypto');

const config = require('./config');
const { isStringNotEmpty, isNumberPositif } = require('../utils/utils');

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
      console.log(e);
    }
  }
  return obj;
};
helpers.createRandomString = (length) => {
  const strLength = isNumberPositif(length) ? length : false;
  console.log(strLength);
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
module.exports = helpers;
