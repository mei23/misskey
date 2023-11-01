type FollowingErrorType = 'noFollowRequest' | 'blocking' | 'blocked' | 'noFollowRequest' | 'followRequestNotFound';

export class FollowingError extends Error {
	public type?: FollowingErrorType;
	constructor(type?: FollowingErrorType) {
		super('following error');
		this.name = 'FollowingError';
		this.type = type;
	}
}
