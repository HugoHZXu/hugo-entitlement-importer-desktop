import { VueQueryPlugin } from '@tanstack/vue-query';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './App.vue';
import './styles.css';
import { router } from '@/routes/router';
import { applyAppLanguage, readStoredAppLanguage } from '@/shared/preferences/language-preference';

applyAppLanguage(readStoredAppLanguage());

createApp(App).use(createPinia()).use(VueQueryPlugin).use(router).mount('#app');
