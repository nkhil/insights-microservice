#!/bin/bash
#set -e

checkerror() {
  RC=$?
  if [ $RC -ne 0 ]; then
    echo -e "ERROR: $*"
    kill $SERVER_PID
    exit 1
  fi
}

export LOG_LEVEL=INFO
./node_modules/.bin/nyc --clean=false --reporter=lcov --report-dir ./coverage/component node index.js &
SERVER_PID=$!;
echo "SERVER_PID: ${SERVER_PID}"
sleep 5
npm run test:feature
checkerror "Failed feature tests"
kill $SERVER_PID
sleep 5
./node_modules/.bin/nyc report --reporter=text-summary
echo "Done"
