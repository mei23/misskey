// test/fix-buffer.js
const { Buffer } = require('node:buffer');

// require('buffer').Buffer が undefined の場合に備えて明示的にセット
if (!global.Buffer) {
  global.Buffer = Buffer;
}
