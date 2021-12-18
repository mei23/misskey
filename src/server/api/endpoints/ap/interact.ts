import $ from 'cafy';
import define from '../../define';
import webfinger from '../../../../remote/webfinger';

export const meta = {
	tags: ['federation'],

	requireCredential: false as const,

	params: {
		acct: {
			validator: $.str,
		},
	},

	errors: {
	},

	res: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
	}
};

export default define(meta, async (ps) => {
	const r = await webfinger(ps.acct);
	const subscribe = r.links.filter(link => link.rel === 'http://ostatus.org/schema/1.0/subscribe')[0];
	if (!subscribe?.template) throw new Error('no subscribe');

	return {
		template: subscribe.template
	};
});
