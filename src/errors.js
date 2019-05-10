class ServiceError extends Error {
  constructor(error) {
    super();
    this.message = error.message;
    this.statusCode = error.statusCode;
  }
}

module.exports = {
  ServiceError
};
