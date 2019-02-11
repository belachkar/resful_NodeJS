const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};

lib.baseDir = path.join(__dirname, '../', '.data');

lib.create = (dir, file, data, callback) => {
  const fileName = getFileName(dir, file);

  fs.open(fileName, 'wx', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      let stringData;
      try {
        stringData = JSON.stringify(data);
      } catch (e) {
        console.error(e);
      }
      fs.writeFile(fileDescriptor, stringData, 'utf8', (err) => {
        if(!err) {
          fs.close(fileDescriptor, (err) => {
            if(!err) {
              callback(false);
            } else {
              callback('Error closing new file:');
            }
          });
        } else {
          callback('Error writing to new file:');
        }
      });
    } else {
      callback('Error creating new file, it maybe exists.');
    }
  });
};

lib.read = (dir, file, callback) => {
  const fileName = getFileName(dir, file);

  fs.open(fileName, 'r', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      // let stringData;
      // try {
      //   stringData = JSON.stringify(data);
      // } catch (e) {
      //   console.error(e);
      // }
      fs.readFile(fileDescriptor, 'utf8', (err, data) => {
        if (!err && data) {
          const parsedData = helpers.parseJsonToObject(data);
          fs.close(fileDescriptor, (err) => {
            if (!err) {
              callback(false, parsedData);
            } else {
              callback('Error closing the exising file:');
            }
          });
        } else {
          callback(err, data);
        }
      });
    } else {
      callback('Error opening the file, it maybe not exist yet.');
    }
  });
};

lib.update = (dir, file, data, callback) => {
  const fileName = getFileName(dir, file);

  fs.open(fileName, 'r+', (err, fileDescriptor) => {
    if (!err && fileDescriptor) {
      let stringData;
      try {
        stringData = JSON.stringify(data);
      } catch (e) {
        console.error(e);
      }
      fs.ftruncate(fileDescriptor, (err) => {
        if (!err) {
          fs.writeFile(fileDescriptor, stringData, 'utf8',(err) => {
            if (!err) {
              fs.close(fileDescriptor, (err) => {
                if (!err) {
                  callback(false);
                } else {
                  callback('Error closing the exising file:');
                }
              });
            } else {
              callback('Error writing to existing file:');
            }
          });
        } else {
          callback('Error truncating the exising file:');
        }
      });
    } else {
      callback('Error opening the file, it maybe not exist yet.');
    }
  });
};

lib.delete = (dir, file, callback) => {
  const fileName = getFileName(dir, file);

  fs.unlink(fileName, (err) => {
    if (!err) {
      callback(false);
    } else {
      callback('Error deleting the file.');
    }
  });
};

function getFileName(dir, file) {
  return path.join(lib.baseDir, dir, file + '.json');
}

module.exports = lib;
