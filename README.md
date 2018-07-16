# Getting Started Microservice
[![coverage report](https://spokedev.githost.io/fab/getting-started-microservice/badges/develop/coverage.svg)](https://spokedev.githost.io/fab/getting-started-microservice/commits/develop)

[![pipeline status](https://spokedev.githost.io/fab/getting-started-microservice/badges/develop/pipeline.svg)](https://spokedev.githost.io/fab/getting-started-microservice/commits/develop)

This repository provides a template for FAB microservice delivery.


## Usage

Fork Template
Change Project Name in package.json, API & product definitions files and deploy/deployment.yaml
Push to repository and check pipeline passes. 


## Rules

Changes are to be made in the given folders and follow the router-controller-adapter pattern.

All code needs test coverage!

Code must

## Logs

Log messages should follow the given patterns including naming of messages as `message` and errors as `err`:

Debug messages provide additional context in development
```
logger.debug({ message: 'Error From DAS Adapter. Returning' });
```

Info messages provide production logs of non-error events
```
logger.info({ message: 'Successfully Created Client' });
```

Error messages provide context as close to the source of an error as possible.
```
logger.error({ err, message: 'Unhandled Error From DAS Adapter' });
```

Fatal messages provide details of fatal events. Fatal events should stop the server to fail fast.
```
logger.fatal({ err, message: `ERROR LOADING SCHEMAS: ${e.message}` });
process.exit(1);
```


## Metrics

Metrics are exposed through the metrics module of `fab_utils`. Increment with: `metrics.increment('clients');`
