# Notes

## Code

### File export patterns

Using `index.js` files in folders to export the content of the folders.

For eg:

```javascript
// controllers/transactions.js

const list = async () => {
  try {
    const trxs = await transactions.list();
    return trxs;
  } catch (err) {
    // only log the error if it hasn't already been caught and logged
    let error = err;
    if (!(err instanceof ServiceError)) {
      console.log({ err: err.message, message: "Internal Server Error" });
      error = new ServiceError(err);
    }
    throw error;
  }
};

module.exports = {
  list
};
```

```javascript
// controllers/index.js

const transactions = require("./transactions");

module.exports = {
  transactions
};
```

Usage:

```javascript
//router.js
const transactions = await controllers.transactions.list();
```

## Using middleware

Middleware is declared in the `middlewares/index.js` file. What qualifies as middleware ?tk (is it when you write a function to send a request through?)

## Linting

```javascript

//"off" in any of the options below will turn a rule off.

{
  "extends": "airbnb-base", //Configuring ESLint to follow the Airbnb style guide (as per the installed `eslint-config-airbnb-base` dependency)
  "plugins": [
    "import" //Refers to the installed eslint-plugin-import dependency
  ],
  "rules": {
    "comma-dangle": [
      "error",  //throws errors on trailing commas in objects
      "never" //"never" (default) disallows trailing commas
    ],
    "no-console": "off", //throws error on console logs being present (when turned on) ?tk
    "no-underscore-dangle" : "off", //eliminate the use of dangling underscores in identifiers (variables, functions)
    "strict": "off", //disallows strict mode directives
    "complexity": ["warn", 10] //This rule is aimed at reducing code complexity by capping the amount of cyclomatic complexity allowed in a program. As such, it will warn when the cyclomatic complexity crosses the configured threshold (default is 20).
  },
  "env": { //specify environments for eslint to be active in ?tk
    "browser": false,
    "commonjs": true,
    "es6": true,
    "mocha": true
  }
}
```

## Testing

### Test coverage handled by [nyc](https://www.npmjs.com/package/nyc)

### Using [nock](https://github.com/nock/nock) for server mocking.

For eg:

```javascript
const transactionsMock = nock(config.transactions.url)
  .get("")
  .reply(200, transactions);
```

```javascript
const transactionsMock = nock(config.transactions.url)
  .get("")
  .reply(500);
```

### Cucumber uses `.feature` files

> A Feature File is an entry point to the Cucumber tests. This is a file where you will describe your tests in Descriptive language (Like English). It is an essential part of Cucumber, as it serves as an automation test script as well as live documents. A feature file can contain a scenario or can contain many scenarios in a single feature file but it usually contains a list of scenarios.
> [[source](https://www.toolsqa.com/cucumber/cucumber-jvm-feature-file/)]
