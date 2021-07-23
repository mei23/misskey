import $, { Context, StringContext, NumberContext } from 'cafy';
import define from '../define';
import endpoints, { Param } from '../endpoints';

export const meta = {
	requireCredential: false,
	allowGet: true,

	tags: ['meta'],

	params: {
		endpoint: {
			validator: $.str,
		}
	},
};

type ParaDesc = {
	name: string;
	type: string;
	desc?: { [key: string]: string };
	deprecated: boolean;
	default?: string | number;
	required: boolean;
	minimum: number | null;
	maximum: number | null;
	enum?: string[];
};

export default define(meta, async (ps) => {
	const ep = endpoints.find(x => x.name === ps.endpoint);
	if (ep == null) return;
	return {
		params: Object.entries(ep.meta.params || {}).map(([k, v]) => genParaDesc(k, v)),
		desc: ep.meta.desc,
		limit: ep.meta.limit,
		allowGet: !!ep.meta.allowGet,
		requireAdmin: !!ep.meta.requireAdmin,
		requireCredential: !!ep.meta.requireCredential,
		requireModerator: !!ep.meta.requireModerator,
		secure: !!ep.meta.secure,
	};
});

const isNumberContext = (c: Context): c is NumberContext => c.name === 'Number';
const isStringContext = (c: Context): c is StringContext => c.name === 'String';

function genParaDesc(name: string, param: Param) {
	const result = {
		name,
		type: param.validator.name === 'ID' ? 'String' : param.validator.name,
		desc: param.desc,
		deprecated: !!param.deprecated,
		default: param.default,
		required: !param.validator.isOptional,	// TODO: Object
	} as ParaDesc;

	if (isNumberContext(param.validator)) {
		result.minimum = param.validator.minimum;
		result.maximum = param.validator.maximum;
	} else if (isStringContext(param.validator)) {
		if (param.validator.enum) {
			result.enum = param.validator.enum;
		} else {
			result.minimum = param.validator.minLength;
			result.maximum = param.validator.maxLength;
		}
	}

	return result;
}
