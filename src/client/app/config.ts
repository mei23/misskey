declare const _LANGS_: string[];
declare const _CONSTANTS_: {
	repositoryUrl: string;
	feedbackUrl: string;
};
declare const _VERSION_: string;
declare const _COMMIT_: {
	id?: string;
	tag?: string;
};
declare const _CODENAME_: string;
declare const _ENV_: string;
declare const _MODS_: {
	defaultDeviceSettings?: {}
};

const address = new URL(location.href);

export const host = address.host;
export const hostname = address.hostname;
export const url = address.origin;
export const apiUrl = url + '/api';
export const wsUrl = url.replace('http://', 'ws://').replace('https://', 'wss://') + '/streaming';
export const lang = localStorage.getItem('lang') || (window as any).lang; // windowは後方互換性のため
export const langs = _LANGS_;
export const locale = JSON.parse(localStorage.getItem('locale'));
export const constants = _CONSTANTS_;
export const version = _VERSION_;
export const codename = _CODENAME_;
export const commit = _COMMIT_;
export const env = _ENV_;
export const mods = _MODS_;
