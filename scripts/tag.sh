#!/bin/bash
MODE=$1
if [[ ${MODE} == "develop" ]] || [[ ${MODE} == "master" ]]
then
  echo "Mode: ${MODE}"
else
  echo "Invalid mode"
  exit 1
fi

# Read and parse version from package.json
PACKAGE_VERSION=`cat package.json | jq -r '.version'`
echo "package.json version: v${PACKAGE_VERSION}"
regex='([0-9]*)\.([0-9]*)\.([0-9]*)'
if [[ $PACKAGE_VERSION =~ $regex ]]
then
  PACKAGE_MAJOR=${BASH_REMATCH[1]}
  PACKAGE_MINOR=${BASH_REMATCH[2]}
  PACKAGE_PATCH=${BASH_REMATCH[3]}
else
  echo "no match"
fi

# Read and parse version from last applied tag on gitlab for this project
LAST_TAG=`curl -s -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" https://spokedev.githost.io/api/v4/projects/${CI_PROJECT_ID}/repository/tags | jq -r '.[0].name'`
echo "LAST TAG: ${LAST_TAG}"

if [[ $LAST_TAG =~ "null" ]] || [ -z $LAST_TAG ]
then
  echo "No previous tag detected."
  LAST_MAJOR=0
  LAST_MINOR=0
  LAST_PATCH=0
else
  regex='v([0-9]*)\.([0-9]*)\.([0-9]*)'
  if [[ $LAST_TAG =~ $regex ]]
  then
    LAST_MAJOR=${BASH_REMATCH[1]}
    LAST_MINOR=${BASH_REMATCH[2]}
    LAST_PATCH=${BASH_REMATCH[3]}
  else
    echo "no match"
  fi
fi

if [[ ${MODE} == "develop" ]]
then
  if [ $PACKAGE_MAJOR -ge $LAST_MAJOR ] && [ $PACKAGE_MINOR -ge $LAST_MINOR ] && [ $PACKAGE_PATCH -gt $LAST_PATCH ]
  then
    echo "Version is OK"
    VERSION="${PACKAGE_VERSION}"
  else
    echo "Incrementing patch version"
    NEW_PATCH=$(($LAST_PATCH + 1))
    VERSION="${LAST_MAJOR}.${LAST_MINOR}.${NEW_PATCH}"
  fi
fi

if [[ ${MODE} == "master" ]]
then
  if [ $PACKAGE_MAJOR -ge $LAST_MAJOR ] && [ $PACKAGE_MINOR -gt $LAST_MINOR ]
  then
    echo "Version is OK"
    VERSION="${PACKAGE_VERSION}"
  else
    echo "Incrementing minor version"
    NEW_MINOR=$(($LAST_MINOR + 1))
    VERSION="${LAST_MAJOR}.${NEW_MINOR}.0"
  fi
fi

echo "New tag: ${VERSION}"

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
