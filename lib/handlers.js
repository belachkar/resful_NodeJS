const {
  isStringNotEmpty,
  isStringWithLength,
  isBooleanTrue,
  isArrayNotEmpty,
  isNumberNatural
} = require('../utils/utils');

const { maxChecks, maxTimeoutChecks } = require('./config');
const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};

handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  const method = data.method;
  if (acceptableMethods.includes(method)) {
    handlers._users[method](data, callback);
  } else {
    callback(405);
  }
};
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  const method = data.method;
  if (acceptableMethods.includes(method)) {
    handlers._tokens[method](data, callback);
  } else {
    callback(405);
  }
};
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  const method = data.method;
  if (acceptableMethods.includes(method)) {
    handlers._checks[method](data, callback);
  } else {
    callback(405);
  }
};
handlers._users = {
  post: (data, callback) => {
    handlers._users.hydratePayload.post(data.payload, (payload) => {
      const { firstName, lastName, phone, password, tosAgreement } = payload;

      if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user doesnt already exists (file with phone Nbr Name)
        _data.read('users', phone, (err, data) => {
          console.log(data);
          const isFileDoesntExists = err;
          if (isFileDoesntExists) {
            const hashedPassword = helpers.hash(password);
            if (hashedPassword) {
              const userObject = {
                firstName,
                lastName,
                phone,
                hashedPassword,
                tosAgreement: true,
              };
              _data.create('users', phone, userObject, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: 'Could not create the new user' });
                }
              });
            } else {
              callback(500, { Error: 'Could not hash the user\'s passwortd' });
            }
          } else {
            callback(400, { Error: 'A user with that phone number already exists' });
          }
        });
      } else {
        callback(400, { Error: 'Missing required fields' });
      }
    });
  },
  get: (data, callback) => {
    const queryObject = data.queryStringObject;
    const phone = isStringWithLength(queryObject.phone, 10) ? queryObject.phone.trim() : false;
    if (phone) {
      const sendedToken = data.headers.token;
      const token = isStringNotEmpty(sendedToken) ? sendedToken : false;

      handlers._tokens.verifyToken(token, phone, (isTokenValid) => {
        if (isTokenValid) {
          _data.read('users', phone, (err, data) => {
            if (!err && data) {
              delete data.hashedPassword;
              callback(200, data);
            } else {
              callback(404);
            }
          });
        } else {
          callback(403, { 'Error': 'Missing resuired token in header or token is invalid' });
        }
      });
    } else {
      callback(400, { Error: 'Missing required field' });
    }
  },
  put: (data, callback) => {
    handlers._users.hydratePayload.put(data.payload, (payload) => {
      const { firstName, lastName, phone, password } = payload;
      if (phone) {
        if (firstName || lastName || password) {
          const sendedToken = data.headers.token;
          const token = isStringNotEmpty(sendedToken) ? sendedToken : false;

          handlers._tokens.verifyToken(token, phone, (isTokenValid) => {
            if (isTokenValid) {
              _data.read('users', phone, (err, userData) => {
                if (!err && userData) {
                  if (firstName) userData.firstName = firstName;
                  if (lastName) userData.lastName = lastName;
                  if (password) userData.hashedPassword = helpers.hash(password);
                  _data.update('users', phone, userData, (err) => {
                    if (!err) {
                      callback(200);
                    } else {
                      callback(500, { Error: 'Could not update the user' });
                    }
                  });
                } else {
                  callback(400, { Error: 'The specified user does not exist' });
                }
              });
            } else {
              callback(403, { 'Error': 'Missing resuired token in header or token is invalid' });
            }
          });
        } else {
          callback(400, { Error: 'Missing fields to update' });
        }
      } else {
        callback(400, { Error: 'Missing required fields' });
      }
    });
  },
  delete: (data, callback) => {
    const queryObject = data.queryStringObject;
    const phone = isStringWithLength(queryObject.phone, 10) ? queryObject.phone.trim() : false;
    if (phone) {
      const sendedToken = data.headers.token;
      const token = isStringNotEmpty(sendedToken) ? sendedToken : false;

      handlers._tokens.verifyToken(token, phone, (isTokenValid) => {
        if (isTokenValid) {
          _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
              _data.delete('users', phone, (err) => {
                if (!err) {
                  const userChecks = Array.isArray(userData.checks) ? [...userData.checks] : [];
                  const checksToDelete = userChecks.length;
                  if (checksToDelete > 0) {
                    let checksDeleted = 0;
                    let deletionErrors = false;
                    userChecks.forEach((checkId) => {
                      _data.delete('checks', checkId, (err) => {
                        if (err) {
                          deletionErrors = true;
                        }
                        checksDeleted++;
                        if (checksDeleted == checksToDelete) {
                          if (!deletionErrors) {
                            callback(200);
                          } else {
                            callback(500, {
                              // eslint-disable-next-line max-len
                              'Error': `Errors encountered while attempting to delete all of the user's checks,
                              All checks may not have been deleted from the system successfully`
                            });
                          }
                        }
                      });
                    });
                  } else {
                    callback(200);
                  }
                } else {
                  callback(400, { 'Error': 'Could not delete the specified user' });
                }
              });
            } else {
              callback(400, { 'Error': 'Could not find the specified user' });
            }
          });
        } else {
          callback(403, { 'Error': 'Missing resuired token in header or token is invalid' });
        }
      });
    } else {
      callback(400, { Error: 'Missing required field' });
    }
  },
  hydratePayload: {
    post: (payload, callback) => {
      const firstName = isStringNotEmpty(payload.firstName) ? payload.firstName.trim() : false;
      const lastName = isStringNotEmpty(payload.lastName) ? payload.lastName.trim() : false;
      const phone = isStringWithLength(payload.phone, 10) ? payload.phone.trim() : false;
      const password = isStringNotEmpty(payload.password) ? payload.password.trim() : false;
      const tosAgreement = isBooleanTrue(payload.tosAgreement) ? true : false;
      callback({ firstName, lastName, phone, password, tosAgreement });
    },
    put: (payload, callback) => {
      const firstName = isStringNotEmpty(payload.firstName) ? payload.firstName.trim() : false;
      const lastName = isStringNotEmpty(payload.lastName) ? payload.lastName.trim() : false;
      const phone = isStringWithLength(payload.phone, 10) ? payload.phone.trim() : false;
      const password = isStringNotEmpty(payload.password) ? payload.password.trim() : false;
      callback({ firstName, lastName, phone, password });
    },
  },
};

handlers._tokens = {
  post: (data, callback) => {
    handlers._tokens.hydratePayload.post(data.payload, (payload) => {
      const { phone, password } = payload;
      if (phone && password) {
        _data.read('users', phone, (err, userData) => {
          if (!err) {
            const hashedPassword = helpers.hash(password);
            if (hashedPassword == userData.hashedPassword) {
              const tokenId = helpers.createRandomString(20);
              const expires = Date.now() + (1000 * 60 * 60);
              const tokenObject = {
                phone,
                id: tokenId,
                expires
              };
              _data.create('tokens', tokenId, tokenObject, (err) => {
                if (!err) {
                  callback(200, tokenObject);
                } else {
                  callback(500, { 'Error': 'Could not create the new token' });
                }
              });
            } else {
              callback(400, { 'Error': 'Password did not match the specified user' });
            }
          } else {
            callback(400, { 'Error': 'Could not find the specified user' });
          }
        });
      } else {
        callback(400, { 'Error': 'Missing required field(s)' });
      }
    });
  },
  get: (data, callback) => {
    const queryObject = data.queryStringObject;
    const id = isStringWithLength(queryObject.id, 20) ? queryObject.id.trim() : false;
    if (id) {
      _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
          callback(200, tokenData);
        } else {
          callback(404);
        }
      });
    } else {
      callback(400, { Error: 'Missing required field' });
    }
  },
  put: (data, callback) => {
    handlers._tokens.hydratePayload.put(data.payload, (payload) => {
      const { id, extend } = payload;
      if (id && extend) {
        _data.read('tokens', id, (err, tokenData) => {
          if (!err && tokenData) {
            if (tokenData.expires > Date.now()) {
              tokenData.expires = Date.now() + (1000 * 60 * 60);
              _data.update('tokens', id, tokenData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { 'Error': 'Coud not update the token\'s expiration' });
                }
              });
            } else {
              callback(400, { 'Error': 'The token has already expired, and cannot be extended' });
            }
          } else {
            callback(400, { 'Error': 'Specified token does not exists' });
          }
        });
      } else {
        callback(404, { 'Error': 'Missing required field(s), or field(s) are invalid' });
      }
    });
  },
  delete: (data, callback) => {
    const queryObject = data.queryStringObject;
    const id = isStringWithLength(queryObject.id, 20) ? queryObject.id.trim() : false;
    if (id) {
      _data.read('tokens', id, (err, data) => {
        if (!err && data) {
          _data.delete('tokens', id, (err) => {
            if (!err) {
              callback(200);
            } else {
              callback(400, { 'Error': 'Could not delete the specified token' });
            }
          });
        } else {
          callback(400, { 'Error': 'Could not find the specified token' });
        }
      });
    } else {
      callback(400, { Error: 'Missing required field' });
    }
  },
  hydratePayload: {
    post: (payload, callback) => {
      const phone = isStringWithLength(payload.phone, 10) ? payload.phone.trim() : false;
      const password = isStringNotEmpty(payload.password) ? payload.password.trim() : false;
      callback({ phone, password });
    },
    put: (payload, callback) => {
      const id = isStringWithLength(payload.id, 20) ? payload.id.trim() : false;
      const extend = isBooleanTrue(payload.extend) ? true : false;
      callback({ id, extend });
    },
  },
  verifyToken: (id, phone, callback) => {
    _data.read('tokens', id, (err, tokenData) => {
      console.log(tokenData);
      if (!err && tokenData) {
        if (tokenData.phone == phone && tokenData.expires > Date.now()) {
          callback(true);
        } else { callback(false); }
      } else { callback(false); }
    });
  },
};

handlers._checks = {
  post: (data, callback) => {
    handlers._checks.hydratePayload.post(data.payload, (payload) => {
      const { protocol, url, method, successCodes, timeoutSeconds } = payload;
      if ( protocol && url && method && successCodes && timeoutSeconds ) {
        const sendedToken = data.headers.token;
        const token = isStringNotEmpty(sendedToken) ? sendedToken : false;

        _data.read('tokens', token, (err, tokenData) => {
          if (!err && tokenData) {
            const userPhone = tokenData.phone;
            _data.read('users', userPhone, (err, userData) => {
              if (!err && userData) {
                let userChecks = Array.isArray(userData.checks) ? [...userData.checks] : [];
                if (userChecks.length < maxChecks) {
                  const checkId = helpers.createRandomString(20);
                  const checkObj = {
                    id: checkId,
                    userPhone,
                    protocol,
                    url,
                    method,
                    successCodes,
                    timeoutSeconds,
                  };
                  _data.create('checks', checkId, checkObj, (err) => {
                    if (!err) {
                      userChecks.push(checkId);
                      userData.checks = userChecks;
                      _data.update('users', userPhone, userData, (err) => {
                        if (!err) {
                          callback(200, checkObj);
                        } else {
                          callback(500, {
                            'Error': 'Could not update the user with the new check'
                          });
                        }
                      });
                    } else {
                      callback(500, { 'Error': 'Could not create the new check' });
                    }
                  });
                } else {
                  callback(400, {
                    'Error': 'The user has already the max number of checks', maxChecks
                  });
                }
              } else {
                callback(403);
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(400, { Error: 'Missing required inputs or inputs are invalid' });
      }
    });
  },
  get: (data, callback) => {
    const queryObject = data.queryStringObject;
    const id = isStringWithLength(queryObject.id, 20) ? queryObject.id.trim() : false;
    if (id) {
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          const sendedToken = data.headers.token;
          const token = isStringNotEmpty(sendedToken) ? sendedToken : false;
          const userPhone = checkData.userPhone;
          handlers._tokens.verifyToken(token, userPhone, (isTokenValid) => {
            if (isTokenValid) {
              callback(200, checkData);
            } else {
              callback(403, { 'Error': 'Missing resuired token in header or token is invalid' });
            }
          });
        } else {
          callback(404);
        }
      });
    } else {
      callback(400, { Error: 'Missing required field' });
    }
  },
  put: (data, callback) => {
    const checkId = data.payload.id;
    const id = isStringWithLength(checkId, 20) ? checkId : false;
    if (id) {
      handlers._checks.hydratePayload.put(data.payload, (payload) => {
        const { protocol, url, method, successCodes, timeoutSeconds } = payload;
        if (protocol || url || method || successCodes || timeoutSeconds) {
          _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
              const sendedToken = data.headers.token;
              const token = isStringNotEmpty(sendedToken) ? sendedToken : false;
              const userPhone = checkData.userPhone;
              handlers._tokens.verifyToken(token, userPhone, (isTokenValid) => {
                if (isTokenValid) {
                  const options = { protocol, url, method, successCodes, timeoutSeconds };
                  Object.keys(options).forEach((option) => {
                    if(options[option]) checkData[option] = options[option];
                  });
                  _data.update('checks', id, checkData, (err) => {
                    if (!err) {
                      callback(200);
                    } else {
                      callback(403, { 'Error': 'Could not update Checks' });
                    }
                  });
                } else {
                  callback(403, {
                    'Error': 'Missing resuired token in header or token is invalid'
                  });
                }
              });
            } else {
              callback(400, { 'Error': 'Check ID did not exist' });
            }
          });
        } else {
          callback(400, { Error: 'Missing fields to update' });
        }
      });
    } else {
      callback(400, { Error: 'Missing required field' });
    }
  },
  delete: (data, callback) => {
    const queryObject = data.queryStringObject;
    const id = isStringWithLength(queryObject.id, 20) ? queryObject.id.trim() : false;
    if (id) {
      _data.read('checks', id, (err, checkData) => {
        if (!err && checkData) {
          const sendedToken = data.headers.token;
          const token = isStringNotEmpty(sendedToken) ? sendedToken : false;
          const userPhone = checkData.userPhone;

          handlers._tokens.verifyToken(token, userPhone, (isTokenValid) => {
            if (isTokenValid) {
              _data.delete('checks', id, (err) => {
                if (!err) {
                  _data.read('users', userPhone, (err, userData) => {
                    if (!err && userData) {
                      const userChecks = Array.isArray(userData.checks) ? [...userData.checks] : [];
                      const checkPosition = userChecks.indexOf(id);
                      if (checkPosition > -1) {
                        userChecks.splice(checkPosition, 1);
                        userData.checks = userChecks;

                        _data.update('users', userPhone, userData, (err) => {
                          if (!err) {
                            callback(200);
                          } else {
                            callback(400, { 'Error': 'Could not delete the specified user' });
                          }
                        });
                      } else {
                        callback(500, {
                          'Error': `Could not find the check on the user object,
                          so could not remove it`
                        });
                      }
                    } else {
                      callback(500, {
                        'Error': `Could not find the user who created the check,
                        so could not remove the check from the user object`
                      });
                    }
                  });
                } else {
                  callback(500, { 'Error': 'Could not delete the specified user' });
                }
              });
            } else {
              callback(403, { 'Error': 'Missing resuired token in header or token is invalid' });
            }
          });
        } else {
          callback(400, { 'Error': 'The specified check ID does not exist' });
        }
      });
    } else {
      callback(400, { Error: 'Missing required field' });
    }
  },
  hydratePayload: {
    post: (payload, callback) => {
      const protocols = ['http', 'https'];
      const methods = ['post', 'get', 'put', 'delete'];
      const prtcl = payload.protocol;
      const mthd = payload.method;
      const timeout = payload.timeoutSeconds;

      const protocol = isStringNotEmpty(prtcl) && protocols.includes(prtcl) ? prtcl : false;
      const url = isStringNotEmpty(payload.url) ? payload.url.trim() : false;
      const method = isStringNotEmpty(mthd) && methods.includes(mthd) ? mthd : false;
      const successCodes = isArrayNotEmpty(payload.successCodes) ? payload.successCodes : false;
      const timeoutSeconds = isNumberNatural(timeout) && timeout <= maxTimeoutChecks ?
        timeout :
        maxTimeoutChecks;
      callback({ protocol, url, method, successCodes, timeoutSeconds });
    },
    put: (data, callback) => {
      handlers._checks.hydratePayload.post(data, callback);
    },
  },
};

handlers.ping = (data, callback) => {
  callback(200);
};

handlers.notFound = (data, callback) => {
  callback(404);
};

module.exports = handlers;
