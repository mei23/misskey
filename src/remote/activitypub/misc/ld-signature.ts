import * as crypto from 'crypto';
import * as util from 'util';
import * as jsonld from 'jsonld';

export async function genKeyPair() {
	return await util.promisify(crypto.generateKeyPair)('rsa', {
		modulusLength: 2048,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem',
			cipher: undefined,
			passphrase: undefined
		}
	});
}

// RsaSignature2017 codes from https://github.com/transmute-industries/RsaSignature2017

export async function signRsaSignature2017(data: any, privateKey: string, creator: string, domain?: string, created?: Date): Promise<any> {
	const options = {
		type: 'RsaSignature2017',
		creator,
		domain,
		nonce: crypto.randomBytes(16).toString('hex'),
		created: (created || new Date()).toISOString()
	} as {
		type: string;
		creator: string;
		domain: string;
		nonce: string;
		created: string;
	};

	if (!domain) {
		delete options.domain;
	}

	const toBeSigned = await createVerifyData(data, options);

	const signer = crypto.createSign('sha256');
	signer.update(toBeSigned);
	signer.end();

	const signature = signer.sign(privateKey);

	return {
		...data,
		signature: {
			...options,
			signatureValue: signature.toString('base64')
		}
	};
}

export async function verifyRsaSignature2017(data: any, publicKey: string): Promise<boolean> {
	const toBeSigned = await createVerifyData(data, data.signature);
	const verifier = crypto.createVerify('sha256');
	verifier.update(toBeSigned);
	return verifier.verify(publicKey, data.signature.signatureValue, 'base64');
}

async function createVerifyData(data: any, options: any) {
	const transformedOptions = {
		...options,
		'@context': 'https://w3id.org/identity/v1'
	};
	delete transformedOptions['type'];
	delete transformedOptions['id'];
	delete transformedOptions['signatureValue'];
	const canonizedOptions = await jsonld.normalize(transformedOptions);
	const optionsHash = sha256(canonizedOptions);
	const transformedData = { ...data };
	delete transformedData['signature'];
	const cannonidedData = await jsonld.normalize(transformedData);
	const documentHash = sha256(cannonidedData);
	const verifyData = `${optionsHash}${documentHash}`;
	return verifyData;
}

function sha256(data: string): string {
	const hash = crypto.createHash('sha256');
	hash.update(data);
	return hash.digest('hex');
}
