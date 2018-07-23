#!/bin/bash

set -e
export LOG_LEVEL=INFO
./node_modules/.bin/nyc --clean=false --reporter=lcov --report-dir ./coverage/component node index.js &
SERVER_PID=$!;
ps -a
sleep 5
npm run test:feature
kill $SERVER_PID
