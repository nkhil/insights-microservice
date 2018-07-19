#!/bin/bash
echo ${CI_COMMIT_TAG}

checkerror() {
  RC=$?
  if [ $RC -ne 0 ]; then
    echo -e "ERROR: $*"
    exit 1
  fi
}

TOKEN=`curl -X "POST" "https://iam.bluemix.net/oidc/token" \
     -H 'Accept: application/json' \
     -H 'Content-Type: application/x-www-form-urlencoded' \
     --data-urlencode "apikey=bkq8-t8QZhRwtw31MggGqnoXFScgyh2MZDvzKKJACjAu" \
     --data-urlencode "response_type=cloud_iam" \
     --data-urlencode "grant_type=urn:ibm:params:oauth:grant-type:apikey" \
     | jq -r '.access_token'`

echo "Saving APIC specs..."

FILES=`ls -1 -F definitions/`
for FILENAME in ${FILES}
do
  IFS='.'
  API=($FILENAME)
  unset IFS
  TARGET_FILENAME=${API[0]}-${CI_COMMIT_TAG}.yaml
  echo "Saving https://s3-api.us-geo.objectstorage.softlayer.net/fab-apic-definitions/${TARGET_FILENAME}"

  curl -X "PUT" "https://s3-api.us-geo.objectstorage.softlayer.net/fab-apic-definitions/${TARGET_FILENAME}" \
         -H "Authorization: Bearer ${TOKEN}" \
         -H "Content-Type: text/plain; charset=utf-8" \
         --data-binary "@definitions/${FILENAME}"
  checkerror "Failed to save API definition to object storage"
done

echo "Saving k8s deployment files..."

curl -X "PUT" "https://s3-api.us-geo.objectstorage.softlayer.net/fab-k8s-deployments/${TARGET_FILENAME}" \
       -H "Authorization: Bearer ${TOKEN}" \
       -H "Content-Type: text/plain; charset=utf-8" \
       --data-binary "@deploy/deployment.yaml"
