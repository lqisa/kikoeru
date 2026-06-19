<template>
  <q-layout view="hHh Lpr lFf" class="bg-grey-3">
    <q-header class="shadow-4">
      <q-toolbar class="row justify-between">
        <q-btn flat dense round @click="drawerOpen = !drawerOpen" icon="menu" aria-label="Menu" />

        <q-btn flat size="md" icon="arrow_back_ios" @click="back()" v-if="isNotAtHomePage" />

        <q-toolbar-title class="gt-xs">
          <router-link :to="'/'" class="text-white"> Kikoeru </router-link>
        </q-toolbar-title>

        <q-input
          dark
          dense
          rounded
          standout
          v-model="keyword"
          debounce="500"
          input-class="text-right"
          class="q-mr-sm"
        >
          <template #append>
            <q-icon v-if="keyword === ''" name="search" />
            <q-icon v-else name="clear" class="cursor-pointer" @click="keyword = ''" />
          </template>
        </q-input>
      </q-toolbar>

      <AudioPlayer />
    </q-header>

    <q-drawer
      v-model="drawerOpen"
      show-if-above
      :mini="miniState"
      @mouseover="miniState = false"
      @mouseout="miniState = true"
      mini-to-overlay
      :width="230"
      :breakpoint="600"
      bordered
      content-class="bg-grey-1"
    >
      <q-scroll-area class="fit">
        <q-list>
          <q-item
            v-for="(link, index) in links"
            :key="index"
            clickable
            v-ripple
            exact
            :to="link.path"
            active-class="text-deep-purple text-weight-medium"
            @click="miniState = true"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-subtitle1">{{ link.title }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            v-ripple
            exact
            active-class="text-deep-purple text-weight-medium"
            @click="randomPlay"
          >
            <q-item-section avatar>
              <q-icon name="shuffle" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-subtitle1">随心听</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            v-ripple
            exact
            active-class="text-deep-purple text-weight-medium"
            @click="showTimer = true"
          >
            <q-item-section avatar>
              <q-icon name="bedtime" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-subtitle1">睡眠模式</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-list>
          <q-item
            clickable
            v-ripple
            exact
            active-class="text-deep-purple text-weight-medium"
            @click="confirm = true"
            v-if="authEnabled"
          >
            <q-item-section avatar>
              <q-icon name="exit_to_app" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-subtitle1">登出</q-item-label>
              <q-item-label caption lines="2">{{ userName }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-dialog v-model="confirm" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="power_settings_new" color="primary" text-color="white" />
          <span class="q-ml-sm">是否退出登录？（若未开启用户验证，则操作无效）</span>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn flat label="退出" color="primary" @click="logout()" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <SleepMode v-model="showTimer" />

    <q-page-container>
      <router-view v-slot="{ Component }">
        <keep-alive include="Works">
          <component :is="Component" />
        </keep-alive>
      </router-view>
      <q-page-scroller position="bottom-right" :scroll-offset="150" :offset="[18, 18]">
        <q-btn fab icon="keyboard_arrow_up" color="accent" />
      </q-page-scroller>
    </q-page-container>

    <q-footer class="q-pa-none">
      <PlayerBar />
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar, LocalStorage } from 'quasar';
import { useUserStore } from '../stores/user';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import { useNotification } from '../composables/useNotification';
import { useApi } from '../composables/useApi';
import type { AuthMeResponse, VersionResponse, SharedConfigResponse, RandomResponse } from '../types';
import PlayerBar from 'components/PlayerBar.vue';
import AudioPlayer from 'components/AudioPlayer.vue';
import SleepMode from 'components/SleepMode.vue';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const api = useApi();
const userStore = useUserStore();
const audioStore = useAudioPlayerStore();
const { showErrNotif, showWarnNotif } = useNotification();

const keyword = ref('');
const drawerOpen = ref(false);
const miniState = ref(true);
const confirm = ref(false);
const randId = ref<number | null>(null);
const showTimer = ref(false);
const sharedConfig = ref({ rewindSeekTime: 5, forwardSeekTime: 30 });

const links = [
  { title: '媒体库', icon: 'widgets', path: '/' },
  { title: '我的收藏', icon: 'favorite', path: '/favourites' },
  { title: '社团', icon: 'group', path: '/circles' },
  { title: '标签', icon: 'label', path: '/tags' },
  { title: '声优', icon: 'mic', path: '/vas' },
  { title: '设定', icon: 'tune', path: '/admin' },
];

const isNotAtHomePage = computed(() => {
  const path = route.path;
  return path && path !== '/' && path !== '/works' && path !== '/favourites';
});

const userName = computed(() => userStore.name);
const authEnabled = computed(() => userStore.auth);

watch(keyword, () => {
  router.push(keyword.value ? `/works?keyword=${keyword.value}` : '/works');
});

watch(randId, () => {
  if (randId.value) {
    router.push(`/work/${randId.value}`);
  }
});

watch(sharedConfig, (config) => {
  audioStore.SET_REWIND_SEEK_TIME(config.rewindSeekTime);
  audioStore.SET_FORWARD_SEEK_TIME(config.forwardSeekTime);
});

const back = () => router.back();

const initUser = () => {
  api
    .get<AuthMeResponse>('/api/auth/me')
    .then((res) => {
      userStore.INIT(res.data.user);
      userStore.SET_AUTH(res.data.auth);
    })
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: { error?: string }; statusText?: string }; message?: string };
      if (err.response) {
        if (err.response.status === 401) {
          if (route.path !== '/login') router.push('/login');
        } else {
          showErrNotif(
            err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
          );
        }
      } else {
        showErrNotif(err.message || String(error));
      }
    });
};

const checkUpdate = () => {
  api
    .get<VersionResponse>('/api/version')
    .then((res) => {
      if (res.data.update_available && res.data.notifyUser) {
        $q.notify({
          message: 'GitHub上有新版本',
          color: 'primary',
          textColor: 'white',
          icon: 'cloud_download',
          timeout: 5000,
          actions: [
            { label: '好', color: 'white' },
            {
              label: '查看',
              color: 'white',
              handler: () =>
                window.open('https://github.com/umonaca/kikoeru-express/releases', '_blank'),
            },
          ],
        });
      }
      if (res.data.lockFileExists) {
        $q.notify({
          message: res.data.lockReason,
          type: 'warning',
          timeout: 60000,
          actions: [
            { label: '以后提醒我', color: 'black' },
            { label: '前往扫描页', color: 'black', handler: () => router.push('/admin/scanner') },
          ],
        });
      }
    })
    .catch((error: unknown) => console.error(error));
};

const readSharedConfig = () => {
  api
    .get<SharedConfigResponse>('/api/config/shared')
    .then((response) => {
      sharedConfig.value = response.data.sharedConfig;
    })
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: { error?: string }; statusText?: string }; message?: string };
      if (err.response) {
        if (err.response.status === 401) {
          if (route.path !== '/login') router.push('/login');
        } else {
          showErrNotif(
            err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
          );
        }
      } else {
        showErrNotif(err.message || String(error));
      }
    });
};

const randomPlay = () => {
  api
    .get<RandomResponse>('/api/random')
    .then((response) => {
      randId.value = response.data.id;
    })
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: { error?: string }; statusText?: string }; message?: string };
      if (err.response) {
        if (err.response.status === 401) {
          showWarnNotif(err.response.data?.error || '');
        } else {
          showErrNotif(
            err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
          );
        }
      } else {
        showErrNotif(err.message || String(error));
      }
    });
};

const logout = () => {
  LocalStorage.remove('jwt-token');
  router.go(0);
};

onMounted(() => {
  initUser();
  checkUpdate();
  readSharedConfig();
});
</script>