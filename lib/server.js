const http = require('http');
const https = require('https');
const fs = require('fs');
const url = require('url');
const { StringDecoder } = require('string_decoder');
const path = require('path');

const handlers = require('./handlers');
const helpers = require('./helpers');
const { httpPort, httpsPort, envName } = require('./config');

const server = {};


// @TODO GET RID OF THIS
// helpers.sendTwilioSms('4158375340', 'Hello', (err) => {
//   console.log('This was the error', err);
// });

const httpsSrvOptions = {
  key: fs.readFileSync(path.join(__dirname, '..', 'https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'https/cert.pem')),
};

const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

const httpsServer = https.createServer(httpsSrvOptions, (req, res) => {
  unifiedServer(req, res);
});

const unifiedServer = (req, res) => {
  const headers = req.headers;
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');
  const method = req.method.toLowerCase();
  const queryStringObject = parsedUrl.query;

  const decoder = new StringDecoder('utf8');
  let buffer = '';

  req
    .on('data', (data) => {
      buffer += decoder.write(data);
    })
    .on('end', () => {
      buffer += decoder.end();
      const chosenHander = typeof (router[trimmedPath]) !== 'undefined' ?
        router[trimmedPath] :
        handlers.notFound;

      const data = {
        trimmedPath,
        queryStringObject,
        method,
        headers,
        payload: helpers.parseJsonToObject(buffer),
      };

      chosenHander(data, (statusCode, payload) => {
        statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
        payload = typeof (payload) == 'object' ? payload : {};
        const payloadString = JSON.stringify(payload);

        res.setHeader('content-type', 'application/json');
        res.writeHead(statusCode);
        res.end(payloadString);

        console.log('Returning this response: ', statusCode, payloadString);
      });
    });
};

// Request Router
const router = {
  'ping': handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks': handlers.checks,
};

server.init = () => {
  httpServer
    .listen(httpPort, () => console.log(`Listening on port ${httpPort} in ${envName}`));
  httpsServer
    .listen(httpsPort, () => console.log(`Listening on port ${httpsPort} in ${envName}`));
};

module.exports = server;
