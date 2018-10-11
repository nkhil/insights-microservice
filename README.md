# The 'Chobbers' Test Experiment
[![coverage report](https://spokedev.githost.io/fab/gettingstarted/badges/develop/coverage.svg)](https://spokedev.githost.io/fab/gettingstarted/commits/develop)

## Test Execution Scripts

* **test:unit** - executes standard unit tests in-process with code coverage being output to ./coverage/unit
* **test:component** - executes feature tests in-process with code coverage being out to ./coverage/component - only stubs need to be running
* **test:feature** - executes feature tests - server must be started and stubs must be running

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

* feature tests are written using cucumber / gherkin
* scenarios should cover the main logic flow and what can be tested without 'special circumstances'
* tests should use common test data / situations
* 'remote-stubs' are implemented via RoboHydra for dependencies
    * remote stubs are started in tests/feature/remote-stubs using robohydra stubs.conf
* traditional 'unit' tests would be implemented to exercise uncovered code
* unit test stubs are written using Nock for special curcumstances
* developers execute test:component and without starting the service
* developers execute test:feature against a running service
* CD/CD executes test:component and test:unit on push
* any errors result in failed pipeline
* During deployment of the service to APIConnect and k8s, CI/CD executes test:feature
* any errors result in failed post deployment readiness

## Next Steps

* implement more complex logic flow and test
* deployment and execution test
* setup and tear down of test data
* request / response validation
* alternative responses
* unathorised
* merge code coverage reports


## Quick migration steps (detailed doc to follow)

1. replace .gitlab-ci.yml
2. replace scripts/
3. replace deploy/
4. replace tests/ then copy over your service specific test files (more detail needed!)
4. check repo name/path is an ok string (all lower case)
5. search/replace deploy/deployment.yaml to replace gettingstarted
6. definitions/<yourservicename>.yaml set target-url string
7. check api definitions (basepath, hostname) match deployment.yaml
8. copy package.json from this repo, edit to change name, version, add your dependencies
9. add CICD secret variables (ask Matt)
10. ...?

Last updated by Phil