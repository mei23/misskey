<template>
<div class="ngbfujlo">
	<ui-textarea class="textarea" :value="text" readonly></ui-textarea>
	<ui-button v-if="$store.state.i != null" primary @click="post()" :disabled="posting || posted">{{ posted ? $t('posted-from-post-form') : $t('post-from-post-form') }}</ui-button>
	<footer v-if="$store.state.i != null" style="padding-top: 8px">
		<button style="padding: 8px" @click="setVisibility" class="visibility" ref="visibilityButton">
			<x-visibility-icon :v="visibility" :localOnly="localOnly" :copyOnce="copyOnce"/>
		</button>
	</footer>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';
import XVisibilityIcon from '../visibility-icon.vue';
import MkVisibilityChooser from '../visibility-chooser.vue';

export default Vue.extend({
	i18n: i18n('pages'),

	components: {
		MkVisibilityChooser,
		XVisibilityIcon,
	},

	props: {
		value: {
			required: true
		},
		script: {
			required: true
		}
	},

	data() {
		return {
			text: this.script.interpolate(this.value.text),
			visibility: 'public',
			localOnly: false,
			copyOnce: false,
			posted: false,
			posting: false,
		};
	},

	created() {
		this.$watch('script.vars', () => {
			this.text = this.script.interpolate(this.value.text);
		}, { deep: true });
	},

	mounted() {
		this.applyVisibility(this.$store.state.settings.defaultNoteVisibility);
	},

	methods: {
		setVisibility() {
			const w = this.$root.new(MkVisibilityChooser, {
				source: this.$refs.visibilityButton,
				currentVisibility: this.visibility
			});
			w.$once('chosen', v => {
				this.applyVisibility(v);
			});
		},

		applyVisibility(v :string) {
			const m = v.match(/^local-(.+)/);
			const n = v.match(/^once-(.+)/);
			if (m) {
				this.localOnly = true;
				this.copyOnce = false;
				this.visibility = m[1];
			} else if (n) {
				this.localOnly = false;
				this.copyOnce = true;
				this.visibility = n[1];
			} else {
				this.localOnly = false;
				this.copyOnce = false;
				this.visibility = v;
			}
		},

		post() {
			this.posting = true;
			this.$root.api('notes/create', {
				text: this.text,
				visibility: this.visibility,
				localOnly: this.localOnly,
				copyOnce: this.copyOnce,
			}).then(() => {
				this.posted = true;
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.ngbfujlo
	padding 0 32px 32px 32px
	border solid 2px var(--pageBlockBorder)
	border-radius 6px

	@media (max-width 600px)
		padding 0 16px 16px 16px

		> .textarea
			margin-top 16px
			margin-bottom 16px

</style>
