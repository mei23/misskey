#!/bin/sh
TS_NODE_FILES=true TS_NODE_TRANSPILE_ONLY=true TS_NODE_PROJECT=./test/tsconfig.json npx mocha $1 --require ts-node/register
