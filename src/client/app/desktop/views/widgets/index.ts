import Vue from 'vue';

// widget/index/desktop
Vue.component('mkw-notifications', () => import('./notifications.vue').then(m => m.default));
Vue.component('mkw-timemachine', () => import('./timemachine.vue').then(m => m.default));
Vue.component('mkw-activity', () => import('./activity.vue').then(m => m.default));
Vue.component('mkw-trends', () => import('./trends.vue').then(m => m.default));
Vue.component('mkw-polls', () => import('./polls.vue').then(m => m.default));
Vue.component('mkw-messaging', () => import('./messaging.vue').then(m => m.default));
Vue.component('mkw-profile', () => import('./profile.vue').then(m => m.default));
Vue.component('mkw-customize', () => import('./customize.vue').then(m => m.default));
Vue.component('mkw-aichan', () => import('./aichan.vue').then(m => m.default));
