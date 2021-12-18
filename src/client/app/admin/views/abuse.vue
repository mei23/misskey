<template>
<div>
	<ui-card>
		<template #title><fa :icon="faExclamationCircle"/> {{ $t('title') }}</template>
		<section class="fit-top">
			<sequential-entrance animation="entranceFromTop" delay="25">
				<div v-for="report in userReports" :key="report.id" class="haexwsjc">
					<div>{{ $t('target') }}: <a :href="report.user | userPage(null, true)"><mk-acct :user="report.user" :simple="true"/></a></div>
					<div>{{ $t('reporter') }}: <a :href="report.reporter | userPage(null, true)"><mk-acct :user="report.reporter" :simple="true"/></a></div>
					<div v-if="(report.notes || []).length > 0">{{ $t('notes') }}: 
						<span v-for="note in report.notes || []" :key="note.id" style="margin-right: 1em">
							<a :href="`/notes/${note.id}`">{{ note.id }}</a>
						</span>
					</div>
					<ui-textarea :value="report.comment" :slim="true" readonly>
						<span>{{ $t('details') }}</span>
					</ui-textarea>
					<ui-button @click="removeReport(report)">{{ $t('remove-report') }}</ui-button>
				</div>
			</sequential-entrance>
			<ui-button v-if="existMore" @click="fetchUserReports">{{ $t('@.load-more') }}</ui-button>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../i18n';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
	i18n: i18n('admin/views/abuse.vue'),

	data() {
		return {
			limit: 10,
			untilId: undefined,
			userReports: [],
			existMore: false,
			faExclamationCircle
		};
	},

	mounted() {
		this.fetchUserReports();
	},

	methods: {
		fetchUserReports() {
			this.$root.api('admin/abuse-user-reports', {
				untilId: this.untilId,
				limit: this.limit + 1
			}).then(reports => {
				if (reports.length == this.limit + 1) {
					reports.pop();
					this.existMore = true;
				} else {
					this.existMore = false;
				}
				this.userReports = this.userReports.concat(reports);
				this.untilId = this.userReports[this.userReports.length - 1].id;
			});
		},

		removeReport(report) {
			this.$root.api('admin/remove-abuse-user-report', {
				reportId: report.id
			}).then(() => {
				this.userReports = this.userReports.filter(r => r.id != report.id);
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.haexwsjc
	padding-top 16px
	padding-bottom 16px
	border-bottom solid 1px var(--faceDivider)

</style>
