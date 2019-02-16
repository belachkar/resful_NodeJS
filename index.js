const server = require('./lib/server');
const workers = require('./lib/workers.js');

const app = {};

app.init = () => {
  server.init();
  workers.init();
};

app.init();

module.exports = app;
