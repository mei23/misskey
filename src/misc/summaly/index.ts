import Summary from './types';
import general from './general';

/**
 * Summarize an web page
 */
export default async (url: string): Promise<Summary> => {
	const _url = new URL(url);

	// Get summary
	const summary = await general(_url);

	if (summary == null) {
		throw 'failed summarize';
	}

	if (summary.url == null) summary.url = url;

	return summary;
};
