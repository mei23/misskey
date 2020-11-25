<template>
<div class="nqfhvmnl">
	<template v-if="page == null || page == 'profile'">
		<x-profile/>
		<x-integration/>
	</template>

	<template v-if="page == null || page == 'appearance'">
		<x-theme/>

		<ui-card>
			<template #title><fa icon="desktop"/> {{ $t('@._settings.appearance') }}</template>

			<section v-if="!$root.isMobile">
				<ui-switch v-model="showPostFormOnTopOfTl">{{ $t('@._settings.post-form-on-timeline') }}</ui-switch>
				<ui-button @click="customizeHome">{{ $t('@.customize-home') }}</ui-button>
			</section>
			<section v-else>
				<ui-switch v-model="showPostFormOnTopOfTlMobile">{{ $t('@._settings.post-form-on-timeline') }}</ui-switch>
			</section>
			<section v-if="!$root.isMobile">
				<header>{{ $t('@._settings.wallpaper') }}</header>
				<ui-horizon-group class="fit-bottom">
					<ui-button @click="updateWallpaper">{{ $t('@._settings.choose-wallpaper') }}</ui-button>
					<ui-button @click="deleteWallpaper">{{ $t('@._settings.delete-wallpaper') }}</ui-button>
				</ui-horizon-group>
			</section>
			<section v-if="!$root.isMobile">
				<header>{{ $t('@._settings.navbar-position') }}</header>
				<ui-radio v-model="navbar" value="top">{{ $t('@._settings.navbar-position-top') }}</ui-radio>
				<ui-radio v-model="navbar" value="bottom">{{ $t('@._settings.navbar-position-bottom') }}</ui-radio>
				<ui-radio v-model="navbar" value="left">{{ $t('@._settings.navbar-position-left') }}</ui-radio>
				<ui-radio v-model="navbar" value="right">{{ $t('@._settings.navbar-position-right') }}</ui-radio>
			</section>
			<section>
				<ui-switch v-model="circleIcons">{{ $t('@._settings.circle-icons') }}</ui-switch>
				<ui-switch v-model="reduceMotion">{{ $t('@._settings.reduce-motion') }}</ui-switch>
				<ui-switch v-model="showFullAcct" v-if="isAdvanced">{{ $t('@._settings.show-full-acct') }}</ui-switch>
				<ui-switch v-model="showVia">{{ $t('@._settings.show-via') }}</ui-switch>
				<ui-switch v-model="iLikeSushi">{{ $t('@._settings.i-like-sushi') }}</ui-switch>
			</section>
			<section>
				<ui-switch v-model="suggestRecentHashtags" v-if="isAdvanced">{{ $t('@._settings.suggest-recent-hashtags') }}</ui-switch>
				<ui-switch v-model="showClockOnHeader" v-if="!$root.isMobile">{{ $t('@._settings.show-clock-on-header') }}</ui-switch>
				<ui-switch v-model="alwaysShowNsfw">{{ $t('@._settings.always-show-nsfw') }}</ui-switch>
				<ui-switch v-model="alwaysOpenCw">{{ $t('@._settings.alwaysOpenCw') }}</ui-switch>
				<ui-switch v-model="showReplyTarget">{{ $t('@._settings.show-reply-target') }}</ui-switch>
				<ui-switch v-model="disableAnimatedMfm">{{ $t('@._settings.disable-animated-mfm') }}</ui-switch>
				<ui-switch v-model="disableShowingAnimatedImages">{{ $t('@._settings.disable-showing-animated-images') }}</ui-switch>
				<ui-switch v-model="disableShowingInstanceInfo">{{ $t('@._settings.disableShowingInstanceInfo') }}</ui-switch>
			</section>
			<section v-if="$root.isMobile">
				<header>{{ $t('@._settings.post-style') }}</header>
				<ui-radio v-model="postStyle" value="standard">{{ $t('@._settings.post-style-standard') }}</ui-radio>
				<ui-radio v-model="postStyle" value="smart">{{ $t('@._settings.post-style-smart') }}</ui-radio>
			</section>
			<section v-if="$root.isMobile">
				<header>{{ $t('@._settings.notification-position') }}</header>
				<ui-radio v-model="mobileNotificationPosition" value="bottom">{{ $t('@._settings.notification-position-bottom') }}</ui-radio>
				<ui-radio v-model="mobileNotificationPosition" value="top">{{ $t('@._settings.notification-position-top') }}</ui-radio>
			</section>
			<section>
				<header>{{ $t('@._settings.deck-column-align') }}</header>
				<ui-radio v-model="deckColumnAlign" value="center">{{ $t('@._settings.deck-column-align-center') }}</ui-radio>
				<ui-radio v-model="deckColumnAlign" value="left">{{ $t('@._settings.deck-column-align-left') }}</ui-radio>
				<ui-radio v-model="deckColumnAlign" value="flexible">{{ $t('@._settings.deck-column-align-flexible') }}</ui-radio>
			</section>
			<section>
				<header>{{ $t('@._settings.visibilityColoring') }}</header>
				<ui-radio v-model="visibilityColoring" value="none">{{ $t('@._settings.visibilityColoring-none') }}</ui-radio>
				<ui-radio v-model="visibilityColoring" value="bg">{{ $t('@._settings.visibilityColoring-bg') }}</ui-radio>
				<ui-radio v-model="visibilityColoring" value="left">{{ $t('@._settings.visibilityColoring-left') }}</ui-radio>
			</section>
			<section v-if="isAdvanced">
				<ui-switch v-model="games_reversi_showBoardLabels">{{ $t('@._settings.show-reversi-board-labels') }}</ui-switch>
				<ui-switch v-model="games_reversi_useAvatarStones">{{ $t('@._settings.use-avatar-reversi-stones') }}</ui-switch>
			</section>
			<section>
				<header>{{ $t('@._settings.emojiFlavor') }}</header>
				<!--
				<ui-input v-model="emojiFlavor" :datalist="['default', 'google']"></ui-input>
				-->
				<ui-select v-model="emojiFlavor">
					<template #label>{{ $t('@._settings.emojiFlavor') }}</template>
					<option value="default">{{ $t('@._settings.emojiFlavor-default') }}</option>
					<option value="google">{{ $t('@._settings.emojiFlavor-google') }}</option>
					<option value="apple">{{ $t('@._settings.emojiFlavor-apple') }}</option>
					<!--
					<option value="facebook">{{ $t('@._settings.emojiFlavor-facebook') }}</option>
					-->
				</ui-select>
			</section>
		</ui-card>
	</template>

	<template v-if="page == null || page == 'behavior'">
		<ui-card>
			<template #title><fa icon="sliders-h"/> {{ $t('@._settings.behavior') }}</template>

			<section>
				<ui-switch v-model="fetchOnScroll">{{ $t('@._settings.fetch-on-scroll') }}
					<template #desc>{{ $t('@._settings.fetch-on-scroll-desc') }}</template>
				</ui-switch>

				<ui-switch v-if="$root.isMobile" v-model="disableViaMobile">{{ $t('@._settings.disable-via-mobile') }}</ui-switch>
			</section>

			<section>
				<header>{{ $t('@._settings.reactions') }}</header>
				<ui-input v-model="reactions" style="font-family: 'Segoe UI Emoji', 'Noto Color Emoji', Roboto, HelveticaNeue, Arial, sans-serif">
					{{ $t('@._settings.reactions') }}<template #desc>{{ $t('@._settings.reactions-description') }}</template>
				</ui-input>
				<ui-horizon-group>
					<ui-button @click="setDefaultReactions"><fa :icon="faUndoAlt"/> {{ $t('@._settings.default') }}</ui-button>
					<ui-button @click="setRandomReactions"><fa :icon="faRandom"/> {{ $t('@._settings.random') }}</ui-button>
				</ui-horizon-group>
				<ui-horizon-group>
					<ui-button @click="previewReaction()" ref="reactionsPreviewButton"><fa :icon="faEye"/> {{ $t('@._settings.preview') }}</ui-button>
					<ui-button @click="save('reactions', splitedReactions)" primary><fa :icon="faSave"/> {{ $t('@._settings.save') }}</ui-button>
				</ui-horizon-group>
				<ui-select v-model="recentReactionsCount">
					<template #label>{{ $t('@._settings.recentReactionsCount') }}</template>
					<option value="0">0</option>
					<option value="5">5</option>
					<option value="10">10</option>
					<option value="15">15</option>
					<option value="20">20</option>
				</ui-select>
				<ui-switch v-model="enableRandomReactionPicker">{{ $t('@._settings.enableRandomReactionPicker') }}</ui-switch>
				<ui-switch v-model="showDislikeInPicker">{{ $t('@._settings.showDislikeInPicker') }}</ui-switch>
			</section>

			<section>
				<header>{{ $t('@._settings.timeline') }}</header>
				<ui-switch v-if="isAdvanced" v-model="showMyRenotes">{{ $t('@._settings.show-my-renotes') }}</ui-switch>
				<ui-switch v-if="isAdvanced"  v-model="showRenotedMyNotes">{{ $t('@._settings.show-renoted-my-notes') }}</ui-switch>
				<ui-switch v-if="isAdvanced"  v-model="showLocalRenotes">{{ $t('@._settings.show-local-renotes') }}</ui-switch>
				<ui-switch v-model="excludeForeignReply">{{ $t('@._settings.excludeForeignReply') }}</ui-switch>
			</section>

			<section>
				<header>{{ $t('@._settings.note-visibility') }}</header>
				<ui-switch v-model="rememberNoteVisibility">{{ $t('@._settings.remember-note-visibility') }}</ui-switch>
				<section>
					<ui-select v-model="defaultNoteVisibility">
						<template #label>{{ $t('@._settings.default-note-visibility') }}</template>
						<option value="public">{{ $t('@.note-visibility.public') }}</option>
						<option value="home">{{ $t('@.note-visibility.home') }}</option>
						<option value="followers">{{ $t('@.note-visibility.followers') }}</option>
						<option value="specified">{{ $t('@.note-visibility.specified') }}</option>
						<option value="local-public">{{ $t('@.note-visibility.local-public') }}</option>
						<option value="local-home">{{ $t('@.note-visibility.local-home') }}</option>
						<option value="local-followers">{{ $t('@.note-visibility.local-followers') }}</option>
						<option value="once-public">{{ $t('@.note-visibility.once-public') }}</option>
						<option value="once-specified">{{ $t('@.note-visibility.once-specified') }}</option>
					</ui-select>
				</section>
				<section>
					<ui-select v-model="secondaryNoteVisibility">
						<template #label>{{ $t('@._settings.secondary-note-visibility') }}</template>
						<option value="none">None</option>
						<option value="public">{{ $t('@.note-visibility.public') }}</option>
						<option value="home">{{ $t('@.note-visibility.home') }}</option>
						<option value="followers">{{ $t('@.note-visibility.followers') }}</option>
						<option value="specified">{{ $t('@.note-visibility.specified') }}</option>
						<option value="local-public">{{ $t('@.note-visibility.local-public') }}</option>
						<option value="local-home">{{ $t('@.note-visibility.local-home') }}</option>
						<option value="local-followers">{{ $t('@.note-visibility.local-followers') }}</option>
						<option value="once-public">{{ $t('@.note-visibility.once-public') }}</option>
						<option value="once-specified">{{ $t('@.note-visibility.once-specified') }}</option>
					</ui-select>
				</section>
				<section>
					<ui-select v-model="tertiaryNoteVisibility">
						<template #label>{{ $t('@._settings.tertiary-note-visibility') }}</template>
						<option value="none">None</option>
						<option value="public">{{ $t('@.note-visibility.public') }}</option>
						<option value="home">{{ $t('@.note-visibility.home') }}</option>
						<option value="followers">{{ $t('@.note-visibility.followers') }}</option>
						<option value="specified">{{ $t('@.note-visibility.specified') }}</option>
						<option value="local-public">{{ $t('@.note-visibility.local-public') }}</option>
						<option value="local-home">{{ $t('@.note-visibility.local-home') }}</option>
						<option value="local-followers">{{ $t('@.note-visibility.local-followers') }}</option>
						<option value="once-public">{{ $t('@.note-visibility.once-public') }}</option>
						<option value="once-specified">{{ $t('@.note-visibility.once-specified') }}</option>
					</ui-select>
				</section>
			</section>

			<section>
				<header>{{ $t('@._settings.hasDisconnectedAction') }}</header>
				<ui-select v-model="hasDisconnectedAction">
					<option value="reload">{{ $t('@._settings._hasDisconnectedAction.reload') }}</option>
					<option value="notify">{{ $t('@._settings._hasDisconnectedAction.notify') }}</option>
					<option value="nothing">{{ $t('@._settings._hasDisconnectedAction.nothing') }}</option>
				</ui-select>
			</section>

			<section>
				<header>{{ $t('@._settings.room') }}</header>
				<ui-select v-model="roomGraphicsQuality">
					<template #label>{{ $t('@._settings._room.graphicsQuality') }}</template>
					<option value="ultra">{{ $t('@._settings._room._graphicsQuality.ultra') }}</option>
					<option value="high">{{ $t('@._settings._room._graphicsQuality.high') }}</option>
					<option value="medium">{{ $t('@._settings._room._graphicsQuality.medium') }}</option>
					<option value="low">{{ $t('@._settings._room._graphicsQuality.low') }}</option>
					<option value="cheep">{{ $t('@._settings._room._graphicsQuality.cheep') }}</option>
				</ui-select>
				<ui-switch v-model="roomUseOrthographicCamera">{{ $t('@._settings._room.useOrthographicCamera') }}</ui-switch>
			</section>
		</ui-card>

		<ui-card>
			<template #title><fa icon="volume-up"/> {{ $t('@._settings.sound') }}</template>

			<section>
				<ui-switch v-model="enableSounds">{{ $t('@._settings.enable-sounds') }}
					<template #desc>{{ $t('@._settings.enable-sounds-desc') }}</template>
				</ui-switch>
				<ui-switch style="margin-left: 2em" :disabled="!enableSounds" v-model="enableSoundsInTimeline">{{ $t('@._settings.Timeline') }}
				</ui-switch>
				<ui-switch style="margin-left: 2em" :disabled="!enableSounds" v-model="enableSoundsInNotifications">{{ $t('@._settings.Notifications') }}
				</ui-switch>
				<div style="display: flex; margin: 1em 0; gap: 1em;">
					<label>{{ $t('@._settings.volume') }}</label>
					<input type="range"
						v-model="soundVolume"
						:disabled="!enableSounds"
						max="1"
						step="0.1"
					/>
				</div>
				<ui-button @click="soundTest"><fa icon="volume-up"/> {{ $t('@._settings.test') }}</ui-button>
			</section>

			<section>
				<ui-switch v-model="enableSpeech">{{ $t('@._settings.enable-speech') }}
					<template #desc>{{ $t('@._settings.enable-speech-desc') }}</template>
				</ui-switch>
			</section>
		</ui-card>

		<x-language/>
	</template>

	<template v-if="page == null || page == 'notification'">
		<x-notification/>
	</template>

	<template v-if="page == null || page == 'drive'">
		<x-drive/>
	</template>

	<template v-if="page == null || page == 'hashtags'">
		<ui-card>
			<template #title><fa icon="hashtag"/> {{ $t('@._settings.tags') }}</template>
			<section>
				<x-tags/>
			</section>
		</ui-card>
	</template>

	<template v-if="page == null || page == 'muteAndBlock'">
		<x-mute-and-block/>
	</template>

	<template v-if="page == null || page == 'extendedNotification'">
		<x-extended-notification/>
	</template>

	<template v-if="page == null || page == 'apps'">
		<ui-card>
			<template #title><fa icon="puzzle-piece"/> {{ $t('@._settings.apps') }}</template>
			<section>
				<x-apps/>
			</section>
		</ui-card>
	</template>

	<template v-if="page == null || page == 'security'">
		<ui-card>
			<template #title><fa icon="unlock-alt"/> {{ $t('@._settings.password') }}</template>
			<section>
				<x-password/>
			</section>
		</ui-card>

		<ui-card v-if="!$root.isMobile">
			<template #title><fa icon="mobile-alt"/> {{ $t('@.2fa') }}</template>
			<section>
				<x-2fa/>
			</section>
		</ui-card>

		<!--
		<ui-card>
			<template #title><fa icon="sign-in-alt"/> {{ $t('@._settings.signin') }}</template>
			<section>
				<x-signins/>
			</section>
		</ui-card>
		-->
	</template>

	<template v-if="page == null || page == 'api'">
		<x-api/>
	</template>

	<template v-if="page == null || page == 'other'">
		<ui-card>
			<template #title><fa icon="sync-alt"/> {{ $t('@._settings.update') }}</template>
			<section>
				<p>
					<span>{{ $t('@._settings.version') }} <i>{{ version }}</i></span>
					<template v-if="latestVersion !== undefined">
						<br>
						<span>{{ $t('@._settings.latest-version') }} <i>{{ latestVersion ? latestVersion : version }}</i></span>
					</template>
				</p>
				<ui-button @click="checkForUpdate" :disabled="checkingForUpdate">
					<template v-if="checkingForUpdate">{{ $t('@._settings.update-checking') }}<mk-ellipsis/></template>
					<template v-else>{{ $t('@._settings.do-update') }}</template>
				</ui-button>
			</section>
		</ui-card>

		<ui-card>
			<template #title><fa icon="cogs"/> {{ $t('@._settings.advanced-settings') }}</template>
			<section>
				<ui-switch v-model="debug" v-if="isAdvanced">
					{{ $t('@._settings.debug-mode') }}<template #desc>{{ $t('@._settings.debug-mode-desc') }}</template>
				</ui-switch>
				<ui-switch v-model="showAdvancedSettings">
					{{ $t('@._settings.ShowAdvancedSettings') }}
				</ui-switch>
			</section>
		</ui-card>
	</template>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';
import X2fa from './2fa.vue';
import XApps from './apps.vue';
import XSignins from './signins.vue';
import XTags from './tags.vue';
import XIntegration from './integration.vue';
import XTheme from './theme.vue';
import XDrive from './drive.vue';
import XMuteAndBlock from './mute-and-block.vue';
import XExtendedNotification from './extended-notification.vue';
import XPassword from './password.vue';
import XProfile from './profile.vue';
import XApi from './api.vue';
import XLanguage from './language.vue';
import XNotification from './notification.vue';
import MkReactionPicker from '../reaction-picker.vue';
import { emojilist } from '../../../../../../misc/emojilist';
import { url, version } from '../../../../config';
import checkForUpdate from '../../../scripts/check-for-update';

import { faSave, faEye } from '@fortawesome/free-regular-svg-icons';
import { faUndoAlt, faRandom } from '@fortawesome/free-solid-svg-icons';
import { emojiRegexWithCustom } from '../../../../../../misc/emoji-regex';

export default Vue.extend({
	i18n: i18n(),
	components: {
		X2fa,
		XApps,
		XSignins,
		XTags,
		XIntegration,
		XTheme,
		XDrive,
		XMuteAndBlock,
		XExtendedNotification,
		XPassword,
		XProfile,
		XApi,
		XLanguage,
		XNotification,
	},
	props: {
		page: {
			type: String,
			required: false,
			default: null
		}
	},
	data() {
		return {
			meta: null,
			version,
			reactions: this.$store.state.settings.reactions.join(''),
			latestVersion: undefined,
			checkingForUpdate: false,
			faSave, faEye, faUndoAlt, faRandom
		};
	},
	computed: {
		isAdvanced(): boolean {
			return this.$store.state.device.showAdvancedSettings;
		},

		splitedReactions(): any {
			const emojis = this.reactions.match(emojiRegexWithCustom);
			return emojis;
		},

		reduceMotion: {
			get() { return this.$store.state.device.reduceMotion; },
			set(value) { this.$store.commit('device/set', { key: 'reduceMotion', value }); }
		},

		navbar: {
			get() { return this.$store.state.device.navbar; },
			set(value) { this.$store.commit('device/set', { key: 'navbar', value }); }
		},

		deckColumnAlign: {
			get() { return this.$store.state.device.deckColumnAlign; },
			set(value) { this.$store.commit('device/set', { key: 'deckColumnAlign', value }); }
		},

		visibilityColoring: {
			get() { return this.$store.state.device.visibilityColoring || 'left'; },
			set(value) { this.$store.commit('device/set', { key: 'visibilityColoring', value }); }
		},

		emojiFlavor: {
			get() { return this.$store.state.device.emojiFlavor || 'default'; },
			set(value) { this.$store.commit('device/set', { key: 'emojiFlavor', value }); }
		},

		enableSounds: {
			get() { return this.$store.state.device.enableSounds; },
			set(value) { this.$store.commit('device/set', { key: 'enableSounds', value }); }
		},

		enableSoundsInTimeline: {
			get() { return this.$store.state.device.enableSoundsInTimeline; },
			set(value) { this.$store.commit('device/set', { key: 'enableSoundsInTimeline', value }); }
		},

		enableSoundsInNotifications: {
			get() { return this.$store.state.device.enableSoundsInNotifications; },
			set(value) { this.$store.commit('device/set', { key: 'enableSoundsInNotifications', value }); }
		},

		enableSpeech: {
			get() { return this.$store.state.device.enableSpeech; },
			set(value) { this.$store.commit('device/set', { key: 'enableSpeech', value }); }
		},

		soundVolume: {
			get() { return this.$store.state.device.soundVolume; },
			set(value) { this.$store.commit('device/set', { key: 'soundVolume', value }); }
		},

		debug: {
			get() { return this.$store.state.device.debug; },
			set(value) { this.$store.commit('device/set', { key: 'debug', value }); }
		},

		showAdvancedSettings: {
			get() { return this.$store.state.device.showAdvancedSettings; },
			set(value) { this.$store.commit('device/set', { key: 'showAdvancedSettings', value }); }
		},

		alwaysShowNsfw: {
			get() { return this.$store.state.device.alwaysShowNsfw; },
			set(value) { this.$store.commit('device/set', { key: 'alwaysShowNsfw', value }); }
		},

		alwaysOpenCw: {
			get() { return !!this.$store.state.device.alwaysOpenCw; },
			set(value) { this.$store.commit('device/set', { key: 'alwaysOpenCw', value }); }
		},

		postStyle: {
			get() { return this.$store.state.device.postStyle; },
			set(value) { this.$store.commit('device/set', { key: 'postStyle', value }); }
		},

		disableViaMobile: {
			get() { return this.$store.state.settings.disableViaMobile; },
			set(value) { this.$store.dispatch('settings/set', { key: 'disableViaMobile', value }); }
		},

		fetchOnScroll: {
			get() { return this.$store.state.settings.fetchOnScroll; },
			set(value) { this.$store.dispatch('settings/set', { key: 'fetchOnScroll', value }); }
		},

		rememberNoteVisibility: {
			get() { return this.$store.state.settings.rememberNoteVisibility; },
			set(value) { this.$store.dispatch('settings/set', { key: 'rememberNoteVisibility', value }); }
		},

		defaultNoteVisibility: {
			get() { return this.$store.state.settings.defaultNoteVisibility; },
			set(value) { this.$store.dispatch('settings/set', { key: 'defaultNoteVisibility', value }); }
		},

		secondaryNoteVisibility: {
			get() { return this.$store.state.settings.secondaryNoteVisibility || 'none'; },
			set(value) { this.$store.dispatch('settings/set', { key: 'secondaryNoteVisibility', value }); }
		},

		tertiaryNoteVisibility: {
			get() { return this.$store.state.settings.tertiaryNoteVisibility || 'none'; },
			set(value) { this.$store.dispatch('settings/set', { key: 'tertiaryNoteVisibility', value }); }
		},

		showReplyTarget: {
			get() { return this.$store.state.settings.showReplyTarget; },
			set(value) { this.$store.dispatch('settings/set', { key: 'showReplyTarget', value }); }
		},

		showMyRenotes: {
			get() { return this.$store.state.settings.showMyRenotes; },
			set(value) { this.$store.dispatch('settings/set', { key: 'showMyRenotes', value }); }
		},

		showRenotedMyNotes: {
			get() { return this.$store.state.settings.showRenotedMyNotes; },
			set(value) { this.$store.dispatch('settings/set', { key: 'showRenotedMyNotes', value }); }
		},

		showLocalRenotes: {
			get() { return this.$store.state.settings.showLocalRenotes; },
			set(value) { this.$store.dispatch('settings/set', { key: 'showLocalRenotes', value }); }
		},

		excludeForeignReply: {
			get() { return this.$store.state.settings.excludeForeignReply; },
			set(value) { this.$store.dispatch('settings/set', { key: 'excludeForeignReply', value }); }
		},

		showPostFormOnTopOfTl: {
			get() { return this.$store.state.settings.showPostFormOnTopOfTl; },
			set(value) { this.$store.dispatch('settings/set', { key: 'showPostFormOnTopOfTl', value }); }
		},

		showPostFormOnTopOfTlMobile: {
			get() { return this.$store.state.settings.showPostFormOnTopOfTlMobile; },
			set(value) { this.$store.dispatch('settings/set', { key: 'showPostFormOnTopOfTlMobile', value }); }
		},

		suggestRecentHashtags: {
			get() { return this.$store.state.settings.suggestRecentHashtags; },
			set(value) { this.$store.dispatch('settings/set', { key: 'suggestRecentHashtags', value }); }
		},

		showClockOnHeader: {
			get() { return this.$store.state.settings.showClockOnHeader; },
			set(value) { this.$store.dispatch('settings/set', { key: 'showClockOnHeader', value }); }
		},

		circleIcons: {
			get() { return this.$store.state.settings.circleIcons; },
			set(value) {
				this.$store.dispatch('settings/set', { key: 'circleIcons', value });
				this.reload();
			}
		},

		showFullAcct: {
			get() { return this.$store.state.settings.showFullAcct; },
			set(value) {
				this.$store.dispatch('settings/set', { key: 'showFullAcct', value });
				this.reload();
			}
		},

		showVia: {
			get() { return this.$store.state.settings.showVia; },
			set(value) { this.$store.dispatch('settings/set', { key: 'showVia', value }); }
		},

		iLikeSushi: {
			get() { return this.$store.state.settings.iLikeSushi; },
			set(value) { this.$store.dispatch('settings/set', { key: 'iLikeSushi', value }); }
		},

		hasDisconnectedAction: {
			get() { return this.$store.state.device.hasDisconnectedAction; },
			set(value) { this.$store.commit('device/set', { key: 'hasDisconnectedAction', value }); }
		},

		roomUseOrthographicCamera: {
			get() { return this.$store.state.device.roomUseOrthographicCamera; },
			set(value) { this.$store.commit('device/set', { key: 'roomUseOrthographicCamera', value }); }
		},

		roomGraphicsQuality: {
			get() { return this.$store.state.device.roomGraphicsQuality; },
			set(value) { this.$store.commit('device/set', { key: 'roomGraphicsQuality', value }); }
		},

		games_reversi_showBoardLabels: {
			get() { return this.$store.state.settings.games.reversi.showBoardLabels; },
			set(value) { this.$store.dispatch('settings/set', { key: 'games.reversi.showBoardLabels', value }); }
		},

		games_reversi_useAvatarStones: {
			get() { return this.$store.state.settings.games.reversi.useAvatarStones; },
			set(value) { this.$store.dispatch('settings/set', { key: 'games.reversi.useAvatarStones', value }); }
		},

		disableAnimatedMfm: {
			get() { return this.$store.state.settings.disableAnimatedMfm; },
			set(value) { this.$store.dispatch('settings/set', { key: 'disableAnimatedMfm', value }); }
		},

		disableShowingAnimatedImages: {
			get() { return this.$store.state.device.disableShowingAnimatedImages; },
			set(value) { this.$store.commit('device/set', { key: 'disableShowingAnimatedImages', value }); }
		},

		disableShowingInstanceInfo: {
			get() { return !!this.$store.state.device.disableShowingInstanceInfo; },
			set(value) { this.$store.commit('device/set', { key: 'disableShowingInstanceInfo', value }); }
		},

		mobileNotificationPosition: {
			get() { return this.$store.state.device.mobileNotificationPosition; },
			set(value) { this.$store.commit('device/set', { key: 'mobileNotificationPosition', value }); }
		},

		showDislikeInPicker: {
			get() { return this.$store.state.device.showDislikeInPicker; },
			set(value) { this.$store.commit('device/set', { key: 'showDislikeInPicker', value }); }
		},

		enableRandomReactionPicker: {
			get() { return this.$store.state.device.enableRandomReactionPicker; },
			set(value) { this.$store.commit('device/set', { key: 'enableRandomReactionPicker', value }); }
		},

		recentReactionsCount: {
			get() { return this.$store.state.device.recentReactionsCount; },
			set(value) {
				this.$store.commit('device/set', { key: 'recentReactionsCount', value });
				this.$store.commit('device/set', { key: 'recentReactions', value: this.$store.state.device.recentReactions.splice(0, value) });
			}
		},
	},
	created() {
		this.$root.getMeta().then(meta => {
			this.meta = meta;
		});

		// 以前の擬態プリンが設定されていた場合は絵文字に置き換える
		try {
			this.reactions = this.reactions.replace('pudding', this.$store.state.settings.iLikeSushi ? '🍣' : '🍮')
		} catch { }
	},
	methods: {
		reload() {
			this.$root.dialog({
				type: 'warning',
				text: this.$t('@.reload-to-apply-the-setting'),
				showCancelButton: true
			}).then(({ canceled }) => {
				if (!canceled) {
					location.reload();
				}
			});
		},
		save(key, value) {
			this.$store.dispatch('settings/set', {
				key,
				value
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					text: this.$t('@._settings.saved')
				})
			});
		},
		customizeHome() {
			location.href = '/?customize';
		},
		updateWallpaper() {
			this.$chooseDriveFile({
				multiple: false
			}).then(file => {
				this.$root.api('i/update', {
					wallpaperId: file.id
				});
			});
		},
		deleteWallpaper() {
			this.$root.api('i/update', {
				wallpaperId: null
			});
		},
		checkForUpdate() {
			this.checkingForUpdate = true;
			checkForUpdate(this.$root, true, true).then(newer => {
				this.checkingForUpdate = false;
				this.latestVersion = newer;
				if (newer == null) {
					this.$root.dialog({
						title: this.$t('@._settings.no-updates'),
						text: this.$t('@._settings.no-updates-desc')
					});
				} else {
					this.$root.dialog({
						title: this.$t('@._settings.update-available'),
						text: this.$t('@._settings.update-available-desc')
					});
				}
			});
		},
		soundTest() {
			const sound = new Audio(`${url}/assets/message.mp3`);
			sound.volume = this.$store.state.device.soundVolume;
			sound.play();
		},
		setDefaultReactions() {
			this.reactions = '👍❤😆🤔😮🎉💢😥😇' + (this.$store.state.settings.iLikeSushi ? '🍣' : '🍮');
		},
		setRandomReactions() {
			const list = emojilist.filter(x => x.category !== 'flags');
			const a = [];
			for (let i = 0; i < 15; i++) {
				const index = Math.floor(Math.random() * list.length);
				const char = list[index].char;
				a.push(char);
			}
			this.reactions = a.join('');
		},
		previewReaction() {
			const picker = this.$root.new(MkReactionPicker, {
				source: this.$refs.reactionsPreviewButton.$el,
				reactions: this.splitedReactions,
				showFocus: false,
			});
			picker.$once('chosen', reaction => {
				picker.close();
			});
		}
	}
});
</script>
