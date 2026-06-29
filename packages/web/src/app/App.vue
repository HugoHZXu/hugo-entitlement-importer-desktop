<script setup lang="ts">
import { History, Settings, UploadCloud } from '@lucide/vue';
import { computed, onMounted, ref } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';

const route = useRoute();
const appInfo = ref<{ appVersion: string; platform: string } | null>(null);

const navItems = [
  { path: '/import/upload', label: 'Import', icon: UploadCloud, match: '/import' },
  { path: '/history', label: 'History', icon: History, match: '/history' },
  { path: '/settings', label: 'Settings', icon: Settings, match: '/settings' },
];

const activePath = computed(() => route.path);
const isStandaloneRoute = computed(() => route.meta.layout === 'standalone');

onMounted(async () => {
  appInfo.value = await window.desktopApi.getAppInfo();
});
</script>

<template>
  <RouterView v-if="isStandaloneRoute" />

  <div v-else class="app-shell">
    <aside class="nav-rail" aria-label="Primary navigation">
      <div class="rail-brand" aria-label="Hugo Entitlement Importer">
        <span>H</span>
      </div>

      <nav class="rail-nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          class="rail-nav-item"
          :class="{ active: activePath.startsWith(item.match) }"
          :to="item.path"
        >
          <component :is="item.icon" :size="22" stroke-width="2.1" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="rail-footer" v-if="appInfo">
        <span>v{{ appInfo.appVersion }}</span>
      </div>
    </aside>

    <main class="main-panel">
      <header class="topbar">
        <div>
          <p class="eyebrow">Hugo Entitlement Importer</p>
          <p class="status-line">
            <span class="status-dot pending" aria-hidden="true"></span>
            Local backend pending
          </p>
        </div>
        <div class="app-meta" v-if="appInfo">
          {{ appInfo.platform }}
        </div>
      </header>

      <RouterView />
    </main>
  </div>
</template>
