const bodyParser = require('body-parser');

const jsonMiddleware = bodyParser.json();

// parses querystrings/headers -> ints where possible and body -> json if content type is set
const parseRequest = () => (req, res, next) => {
  jsonMiddleware(req, res, (err) => {
    if (err) {
      console.log({ message: 'Unknown Error Parsing Body' });
      req.body = null;
    }
    next();
  });
};

module.exports = parseRequest;
