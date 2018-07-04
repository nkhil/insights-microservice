function define(name, value) {
  Object.defineProperty(exports, name, {
    value,
    enumerable: true,
    writable: false,
    configurable: false
  });
}

define('CORRELATION_HEADER', 'x-request-id');
define('EXECUTION_HEADER', 'x-exec-id');
define('TRACKING_NAMESPACE', 'tracking');
