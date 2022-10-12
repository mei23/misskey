import Vue from 'vue';

// widget/index/common
Vue.component('mkw-analog-clock', () => import('./analog-clock.vue').then(m => m.default));
Vue.component('mkw-nav', () => import('./nav.vue').then(m => m.default));
Vue.component('mkw-calendar', () => import('./calendar.vue').then(m => m.default));
Vue.component('mkw-slideshow', () => import('./slideshow.vue').then(m => m.default));
Vue.component('mkw-tips', () => import('./tips.vue').then(m => m.default));
Vue.component('mkw-broadcast', () => import('./broadcast.vue').then(m => m.default));
Vue.component('mkw-server', () => import('./server.vue').then(m => m.default));
Vue.component('mkw-posts-monitor', () => import('./posts-monitor.vue').then(m => m.default));
Vue.component('mkw-memo', () => import('./memo.vue').then(m => m.default));
Vue.component('mkw-rss', () => import('./rss.vue').then(m => m.default));
Vue.component('mkw-version', () => import('./version.vue').then(m => m.default));
Vue.component('mkw-hashtags', () => import('./hashtags.vue').then(m => m.default));
Vue.component('mkw-words', () => import('./words.vue').then(m => m.default));
Vue.component('mkw-instance', () => import('./instance.vue').then(m => m.default));
Vue.component('mkw-post-form', () => import('./post-form.vue').then(m => m.default));
Vue.component('mkw-queue', () => import('./queue.vue').then(m => m.default));
Vue.component('mkw-sunmoon', () => import('./sunmoon.vue').then(m => m.default));
