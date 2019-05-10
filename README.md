# Example Microservice

Link to Insights Test: https://github.com/jigsawxyz/recruitment-uk

### Instructions:

#### Install:

`npm install`

#### Unit Tests:

`npm run test:unit`

#### Component Tests:

Component tests will run the full service, from going in through the router and returning a response. In component mode, all external services will be stubbed.

To run, we will need 2 terminal sessions open.

First, run the stubs:

`npm run start:stubs`

Then, run the component tests:

`npm run test:component`

#### Feature Tests

Feature tests (or Integration Tests) will run the same tests as component tests. However, in feature mode, all external services will NOT be stubbed.

To run, we will need 2 terminal sessions open.

First, run the service with the correct environment variables:

`TRANSACTIONS_URL=https://transactions.spokedev.xyz/transactions npm start`

Then, run the feature tests:

`npm run test:feature`
