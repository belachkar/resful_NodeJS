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
utils.isEmpty = (data) => {
  data = utils.isString(data) ? data.trim() : data;
  return !(data.length > 0);
};
utils.hasLength = (data, length) => {
  return data.length === length;
};
utils.isStringNotEmpty = (data) => {
  return utils.isString(data) && !(utils.isEmpty(data));
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
utils.isBooleanTrue = (data) => {
  return utils.isBoolean(data) && data == true;
};
utils.isArrayNotEmpty = (data) => {
  return Array.isArray(data) && data.length > 0;
};

module.exports = utils;
