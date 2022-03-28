const twemojiRegex = require('twemoji-parser/dist/lib/regex').default;

export const emojiRegex = new RegExp(`(${twemojiRegex.source})`);

export const emojiRegexWithCustom = new RegExp(`(${emojiRegex.source}|:[0-9A-Za-z_]+:)`, 'g');

// Ninja catなどTwemojiを迂回させたいもの
export const vendorEmojiRegex = /(\uD83D\uDC31\u200D(?:\uD83D\uDC64|\uD83D\uDE80|\uD83D\uDC53|\uD83D\uDCBB|\uD83D\uDC09|\uD83C\uDFCD))/;

// ローカル定義Twemoji
export const localEmojiRegex = /(\uD83E[\uDEE0-\uDEE6]|\uD83E\uDD79|\uD83E[\uDEF0-\uDEF6](?:\uD83C[\uDFFB-\uDFFF])?|\uD83E[\uDEC3-\uDEC5]|\uD83E\uDDCC|\uD83E[\uDEB7-\uDEBA]|\uD83E[\uDED7-\uDED9]|\uD83D[\uDEDD-\uDEDF]|\uD83E[\uDEA9-\uDEAC]|\uD83E\uDE7B|\uD83E\uDE7C|\uD83E\uDEE7|\uD83D\uDFF0)/;

