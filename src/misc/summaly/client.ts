import * as client from 'cheerio-httpcli';

client.set('headers', {
	'User-Agent': `SummalyBot`
});
client.set('referer', false);
client.set('timeout', 20000);
client.set('maxDataSize', 10 * 1024 * 1024);

export function createInstance() {
	return client.fork();
}
