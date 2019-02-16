const utils = {};

utils.isString = (data) => {
  return typeof (data) == 'string';
};
utils.isBoolean = (data) => {
  return typeof (data) == 'boolean';
};
utils.isNumber = (data) => {
  return typeof (data) == 'number';
};
utils.isArray = (data) => {
  return Array.isArray(data);
};
utils.isObject = (data) => {
  return typeof(data) == 'object' && data !== null;
};
utils.isEmpty = (data) => {
  data = utils.isString(data) ? data.trim() : data;
  return !(data.length > 0);
};
utils.isStringNotEmpty = (data) => {
  return utils.isString(data) && !(utils.isEmpty(data));
};
utils.isArrayNotEmpty = (data) => {
  return utils.isArray(data) && !(utils.isEmpty(data));
};
utils.isObjectNotEmpty = (data) => {
  return utils.isObject(data) && data !== {};
};
utils.isNumberPositif = (data) => {
  return utils.isNumber(data) && data > 0;
};
utils.isNumberWhole = (data) => {
  return utils.isNumber(data) && data % 1 === 0;
};
utils.isNumberNatural = (data) => {
  return utils.isNumberWhole(data) && data > 0;
};
utils.isStringWithLength = (data, length) => {
  return utils.isString(data) && utils.hasLength(data.trim(), length);
};
utils.isStringLengthBetweenStrict = (data, minLength, maxLength) => {
  return utils.isString(data) && data.trim().length > minLength && data.trim().length < maxLength;
};
utils.isBooleanTrue = (data) => {
  return utils.isBoolean(data) && data == true;
};
utils.hasLength = (data, length) => {
  return data.length === length;
};

module.exports = utils;
