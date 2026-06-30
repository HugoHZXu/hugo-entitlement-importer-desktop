import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import './styles.css';
import { router } from '@/routes/router';
import { i18n, syncAppLanguage } from '@/shared/i18n';

syncAppLanguage();

createApp(App).use(createPinia()).use(VueQueryPlugin).use(i18n).use(router).mount('#app');
