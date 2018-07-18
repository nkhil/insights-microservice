# The 'Chobbers' Test Experiment

## Test Execution Scripts

* **test:unit** - executes standard unit tests
* **test:component** - executes feature tests in 'component' mode without starting server
* **test:coverage** - executes feature tests in 'component' mode and tracks code coverage
* **test:feature** - executes feature tests in 'feature' mode which expects a server to be listening

## The principles behind this testing experiment is to: 

* use the same 'higher order' tests for local/CI component testing and feature testing post deployment
* prune the number of potentially 'duplicate' tests / responses
* maintain code coverage analysis and quality bar
* maximise test quality component and 'smoke' testing
* minimise developer testing effort through a smaller number of tests and write once, run many
* minimise integration testing and issues post deployment 

## The test boundary is at the component (aka Service) level which encompasses:

* Routers
* Controllers
* Adapters

## The proposed approach:

* 'feature' tests are written using cucumber / gherkin
* features are tested via the 'front door' e.g. router/APIConnect
* scenarios should cover the main logic flow and what can be tested without 'special circumstances'
* tests should use common test data / situations
* component mode stubs are implemented using Nock
* feature mode 'remote-stubs' are only implemented via RoboHydra when dependencies are not ready
    * remote stubs are started in tests/feature/remote-stubs using robohydra hydra.conf
* local and remote stubs use same requests / response in test/requests or test/responses
* traditional 'unit' tests would be implemented to exercise uncovered code
* developers execute test:component and test:coverage without starting the service
* developers execute test:feature against a running service
* CD/CD executes test:component and test:coverage on push
* any errors result in failed pipeline
* During deployment of the service to APIConnect and k8s, CI/CD executes test:feature
* any errors result in failed post deployment readiness

## Next Steps

* implement more complex logic flow and test
* deployment and execution test
* fix coverage not ending
* setup and tear down of test data
* request / response validation
* alternative responses
* unathorised