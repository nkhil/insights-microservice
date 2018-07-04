const EventEmitter = require('events');
const http = require('http');

// allows for the creation of a simple http server with an arbitary response
class SimpleServer extends EventEmitter {
  constructor({ responseFn }) {
    super();
    this.responseFunction = responseFn;
    this.requests = [];
  }

  async start({ port, hostname = 'localhost' }) {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        let body = '';
        req.on('data', (data) => {
          body += data;
        });
        req.on('end', () => {
          const request = { ...req, body, timeServed: new Date() };
          this.requests.push(request);
          this.emit('newRequest', request);
          return this.responseFunction(req, res);
        });
      });
      this.server.listen({ port, hostname }, (e, d) => (e ? reject(e) : resolve(d)));
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.server.close((e, d) => (e ? reject(e) : resolve(d)));
    });
  }

  setResponseFn(responseFn) {
    this.responseFunction = responseFn;
  }

  getRequests() {
    return this.requests;
  }
}

module.exports = {
  SimpleServer
};
