const twemojiRegex = require('twemoji-parser/dist/lib/regex').default;

export const emojiRegex = new RegExp(`(${twemojiRegex.source})`);

export const emojiRegexWithCustom = new RegExp(`(${emojiRegex.source}|:[0-9A-Za-z_]+:)`, 'g');

// Ninja catなどTwemojiを迂回させたいもの
export const vendorEmojiRegex = /(\uD83D\uDC31\u200D(?:\uD83D\uDC64|\uD83D\uDE80|\uD83D\uDC53|\uD83D\uDCBB|\uD83D\uDC09|\uD83C\uDFCD))/;

// ローカル定義Twemoji
export const localEmojiRegex = /(\uD83E[\uDEE0-\uDEE6]|\uD83E\uDD79|\uD83E[\uDEF0-\uDEF6]|\uD83E[\uDEC3-\uDEC5])/;

