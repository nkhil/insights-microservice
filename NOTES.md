# Notes

## Code

### File patterns

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

## Testing

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
