#!/bin/bash
curl --request POST -s -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" https://spokedev.githost.io/api/v4/projects/368/pipeline?ref=develop
