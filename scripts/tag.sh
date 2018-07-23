#!/bin/bash
VERSION=`cat package.json | jq -r '.version'`
RESULT=`curl -X "POST" "https://spokedev.githost.io/api/v4/projects/${CI_PROJECT_ID}/repository/tags?tag_name=v${VERSION}&ref=${CI_COMMIT_SHA}" -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}"`

if [[ $RESULT = *"already exists"* ]];
then
  echo "Tag already existed - FAIL"
  echo "result: ${RESULT}"
  exit 1
else
  echo "Tag created ok!"
  echo "result: ${RESULT}"
  exit 0
fi
