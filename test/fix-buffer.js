// test/fix-buffer.js
const bufferModule = require('node:buffer');

// Node.js 24+ で SlowBuffer が削除/undefined になったことへの対処
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = class SlowBuffer {};
}
if (!bufferModule.SlowBuffer.prototype) {
  bufferModule.SlowBuffer.prototype = {};
}
