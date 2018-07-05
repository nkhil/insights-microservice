const cls = require('cls-hooked');
const bunyan = require('bunyan');
const constants = require('../constants');
const config = require('../config');

Object.defineProperty(global, '__stack', {
  get() {
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const err = new Error();
    Error.captureStackTrace(err, this);
    const { stack } = err;
    Error.prepareStackTrace = orig;
    return stack;
  }
});

Object.defineProperty(global, '__info', {
  get() {
    const stack = global.__stack[3];
    return {
      line: stack.getLineNumber(),
      class: stack.getTypeName(),
      function: stack.getFunctionName()
    };
  }
});

function requestSerializer(req) {
  if (!req || !req.connection) { return req; }
  return {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  };
}

function responseSerializer(res) {
  if (!res) { return res; }
  return {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    headers: res._header
  };
}

const bunyanLogger = bunyan.createLogger({
  name: 'erebus',
  level: config.logging.level,
  serializers: {
    req: requestSerializer,
    res: responseSerializer
  }
});

class Logger {
  static new(options) {
    const logInstance = bunyanLogger.child(options);
    cls.getNamespace(constants.TRACKING_NAMESPACE).set('logger', logInstance);
    return logInstance;
  }

  static startTimer() {
    const ns = cls.getNamespace(constants.TRACKING_NAMESPACE);
    const logInstance = ns ? (ns.get('logger') || bunyanLogger) : bunyanLogger;
    return {
      startTimestamp: Date.now(),
      endTimestamp: null,
      duration: null,
      stop: function stop() {
        this.endTimestamp = Date.now();
        this.duration = this.endTimestamp - this.startTimestamp;
        const logdata = {
          start: this.startTimestamp,
          end: this.endTimestamp,
          duration: this.duration,
          type: 'timingRecord'
        };
        return {
          debug: obj => logInstance.debug({
            ...logdata,
            line: global.__info.line,
            function: global.__info.function,
            class: global.__info.class,
            ...obj
          }),
          info: obj => logInstance.info({
            ...logdata,
            line: global.__info.line,
            function: global.__info.function,
            class: global.__info.class,
            ...obj
          }),
          error: obj => logInstance.error({
            ...logdata,
            line: global.__info.line,
            function: global.__info.function,
            class: global.__info.class,
            ...obj
          })
        };
      }
    };
  }

  static info(obj) {
    if (bunyan.INFO >= bunyanLogger._level) {
      const ns = cls.getNamespace(constants.TRACKING_NAMESPACE);
      if (!ns) {
        bunyanLogger.info({
          ...obj,
          line: global.__info.line,
          function: global.__info.function,
          class: global.__info.class
        });
        return;
      }
      const instance = ns.get('logger') || bunyanLogger;
      instance.info({
        ...obj,
        line: global.__info.line,
        function: global.__info.function,
        class: global.__info.class
      });
    }
  }

  static error(obj) {
    if (bunyan.ERROR >= bunyanLogger._level) {
      const ns = cls.getNamespace(constants.TRACKING_NAMESPACE);
      if (!ns) {
        bunyanLogger.error({
          ...obj,
          line: global.__info.line,
          function: global.__info.function,
          class: global.__info.class
        });
        return;
      }
      const instance = ns.get('logger') || bunyanLogger;
      instance.error({
        ...obj,
        line: global.__info.line,
        function: global.__info.function,
        class: global.__info.class
      });
    }
  }

  static debug(obj) {
    if (bunyan.DEBUG >= bunyanLogger._level) {
      const ns = cls.getNamespace(constants.TRACKING_NAMESPACE);
      if (!ns) {
        bunyanLogger.debug({
          ...obj,
          line: global.__info.line,
          function: global.__info.function,
          class: global.__info.class
        });
        return;
      }
      const instance = ns.get('logger') || bunyanLogger;
      instance.debug({
        ...obj,
        line: global.__info.line,
        function: global.__info.function,
        class: global.__info.class
      });
    }
  }

  static invocation(obj) {
    if (bunyan.DEBUG >= bunyanLogger._level) {
      const ns = cls.getNamespace(constants.TRACKING_NAMESPACE);
      if (!ns) {
        bunyanLogger.debug({
          ...obj,
          line: global.__info.line,
          function: global.__info.function,
          class: global.__info.class,
          type: 'fnInvocation'
        });
        return;
      }
      const instance = ns.get('logger') || bunyanLogger;
      instance.debug({
        ...obj,
        line: global.__info.line,
        function: global.__info.function,
        class: global.__info.class,
        type: 'fnInvocation'
      });
    }
  }
}

module.exports = Logger;
