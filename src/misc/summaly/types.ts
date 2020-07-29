type Summary = {
	/**
	 * The description of that web page
	 */
	description: string | null;

	/**
	 * The url of the icon of that web page
	 */
	icon: string | null;

	/**
	 * The name of site of that web page
	 */
	sitename: string | null;

	/**
	 * The url of the thumbnail of that web page
	 */
	thumbnail: string | null;

	/**
	 * The player of that web page
	 */
	player: Player;

	/**
	 * The title of that web page
	 */
	title: string | null;

	/**
	 * Possibly sensitive
	 */
	sensitive?: boolean;

	/**
	 * 最終リダイレクト先URL
	 */
	url?: string;
};

export default Summary;

export type Player = {
	/**
	 * The url of the player
	 */
	url: string | null;

	/**
	 * The width of the player
	 */
	width: number | null;

	/**
	 * The height of the player
	 */
	height: number | null;
};
