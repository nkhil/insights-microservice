#!/bin/bash
echo "Checking version against existing tags..."
VERSION=`cat package.json | jq -r '.version'`
LAST_TAG=`curl -s -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" https://spokedev.githost.io/api/v4/projects/${CI_PROJECT_ID}/repository/tags | jq -r '.[0].name'`
echo "THIS VERSION: v${VERSION}"
echo "LAST TAG: ${LAST_TAG}"

if [[ $LAST_TAG =~ "null" ]] || [ -z $LAST_TAG ]
then
  echo "No previous tag detected."
  exit 0
fi

regex='([0-9]*)\.([0-9]*)\.([0-9]*)'
if [[ $VERSION =~ $regex ]]
then
  THIS_MAJOR=${BASH_REMATCH[1]}
  THIS_MINOR=${BASH_REMATCH[2]}
  THIS_PATCH=${BASH_REMATCH[3]}
else
  echo "no match"
fi

regex='v([0-9]*)\.([0-9]*)\.([0-9]*)'
if [[ $LAST_TAG =~ $regex ]]
then
  LAST_MAJOR=${BASH_REMATCH[1]}
  LAST_MINOR=${BASH_REMATCH[2]}
  LAST_PATCH=${BASH_REMATCH[3]}
else
  echo "no match"
fi

if [ $THIS_MAJOR -ge $LAST_MAJOR ] && [ $THIS_MINOR -ge $LAST_MINOR ] && [ $THIS_PATCH -gt $LAST_PATCH ]
then
  echo "Version is OK"
else
  echo "Version needs to be higher"
  exit 1
fi
