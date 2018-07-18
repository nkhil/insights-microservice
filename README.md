# The 'Chobbers' Test Experiment

## The principles behind this testing experiment is to: 

* use the same 'core feature' tests for local/CI 'component' testing and 'feature' testing post deployment
* prune the number of potentially 'duplicate' tests / responses
* maintain code coverage analysis and quality bar
* maximise test quality component and 'smoke' testing
* minimise developer testing effort through a smaller number of tests
* minimise 'integration' testing and issues post deployment 

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
    * remote stubs are started in tests/remote-stubs using robohydra hydra.conf
* local and remote stubs use same requests / response in test/requests or test/responses
* traditional 'unit' tests would be implemented to exercise uncovered code
* developers execute test:component and test:coverage without starting the service
* developers execute test:feature against a running service
* CD/CD executes test:component and test:coverage on push
* any errors result in failed pipeline
* During deployment of the service to APIConnect and k8s, CI/CD:
    * updates the evironment config e.g. APIC_URL (the API Connect URL for the microservice)
    * executes test:feature
* any errors result in failed post deployment readiness

## Next Steps

* (DONE) checkin to gitlab
* deployment and execution test
* implement more complex logic flow and test
* (DONE) create test config and move APIC_URL out of config
* (DONE) change test_type to test_mode
* (DONE) fix up folder test structure remote-stubs in features and helpers in test
* (DONE) credentials for APIConnect Service and DAS
* fix coverage not ending
* setup and tear down of test data
* request / response validation
* fixup or ignore robohydra lint errors
* alternative responses
* unathorised
* (DONE) change console.log statements to proper logs
* (LOW PRIORITY) combine code coverage across both unit and feature tests
* (NOT IMPLEMENTING) rename feature as 'smoke'
