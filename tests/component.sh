#!/bin/sh

# set -e

LOG_LEVEL=INFO ./node_modules/.bin/nyc --reporter=lcov --report-dir ./coverage/component node index.js &
SERVER_PID=$!; 
sleep 5
npm run test:feature
kill $SERVER_PID