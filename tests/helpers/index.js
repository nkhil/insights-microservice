class ResponseStub {
  status(status) {
    this.statusCode = status;
    return this;
  }

  location(location) {
    this.location = location;
    return this;
  }

  json(body) {
    this.body = JSON.stringify(body);
    return this;
  }

  end() {
    return this;
  }
}

async function testRouter(router, request) {
  const response = new ResponseStub();
  return new Promise((resolve, reject) => {
    router.handle(request, response, (error) => {
      if (error) {
        reject(error);
      }
      resolve(response);
    });
  });
}

module.exports = {
  testRouter
};
