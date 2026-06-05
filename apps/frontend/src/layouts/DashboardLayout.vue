<template>
  <q-layout view="hhh LpR fFf">
    <q-header elevated class="bg-black">
      <q-toolbar>
        <q-btn flat @click="drawer = !drawer" round dense icon="menu" />
        <q-toolbar-title>仪表盘</q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawer"
      show-if-above
      :mini="miniState"
      @mouseover="miniState = false"
      @mouseout="miniState = true"
      mini-to-overlay
      :width="200"
      :breakpoint="500"
      bordered
      content-class="bg-grey-3"
    >
      <div class="column justify-between fit">
        <q-list padding class="col-auto">
          <q-item
            v-for="(link, index) in links"
            :key="index"
            clickable
            v-ripple
            exact
            :to="link.path"
            active-class="text-primary text-weight-bold"
            class="col text-subtitle1"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>
            <q-item-section>{{ link.title }}</q-item-section>
          </q-item>
        </q-list>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { LocalStorage } from 'quasar';
import { useUserStore } from '../stores/user';
import { useNotification } from '../composables/useNotification';
import { useSocket } from '../composables/useSocket';

const router = useRouter();
const userStore = useUserStore();
const { showSuccNotif, showWarnNotif } = useNotification();
const { registerEvent, setAuthToken, open, close } = useSocket();

const drawer = ref(false);
const miniState = ref(true);

const links = [
  { title: '音声库', icon: 'folder', path: '/admin' },
  { title: '扫描', icon: 'youtube_searched_for', path: '/admin/scanner' },
  { title: '用户管理', icon: 'person', path: '/admin/usermanage' },
  { title: '高级设置', icon: 'settings', path: '/admin/advanced' },
  { title: '回到主页', icon: 'home', path: '/' },
] as const;

// Socket.IO event handlers
interface SocketSuccessPayload {
  message: string;
  auth: boolean;
  user: { name: string; group: string };
}

interface SocketErrorPayload {
  message?: string;
}

registerEvent('success', (...args: unknown[]) => {
  const payload = args[0] as SocketSuccessPayload;
  showSuccNotif(payload.message);
  if (payload.auth) {
    userStore.INIT(payload.user);
    userStore.SET_AUTH(payload.auth);
  }
});

registerEvent('error', (...args: unknown[]) => {
  const err = args[0] as SocketErrorPayload | string;
  const msg = typeof err === 'string' ? err : (err.message ?? String(err));
  showWarnNotif(msg);
  close();
  void router.push('/login');
});

onMounted(() => {
  const token = LocalStorage.getItem('jwt-token');
  if (typeof token === 'string') {
    setAuthToken(token);
  }

  const socketState = useSocket().socket;
  if (!socketState.value.connected) {
    open();
  }
});
</script>
