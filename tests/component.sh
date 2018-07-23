#!/bin/bash

#set -e
export LOG_LEVEL=INFO
./node_modules/.bin/nyc --clean=false --reporter=lcov --report-dir ./coverage/component node index.js &
SERVER_PID=$!;
echo "SERVER_PID: ${SERVER_PID}"
sleep 5
npm run test:feature
kill $SERVER_PID
echo "Done"
