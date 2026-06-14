<template>
  <div>
    <q-card class="q-ma-md">
      <q-toolbar><q-toolbar-title>用户管理</q-toolbar-title></q-toolbar>
      <q-list>
        <q-item v-for="u in users" :key="u.name">
          <q-item-section>
            <q-item-label>{{ u.name }}</q-item-label>
            <q-item-label caption>{{ u.group }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApi } from '../../composables/useApi';
import type { UsersResponse, UserInfo } from '../../types';

const api = useApi();
const users = ref<UserInfo[]>([]);

onMounted(() => {
  api
    .get<UsersResponse>('/api/credentials/users')
    .then((r) => {
      users.value = r.data.users || [];
    })
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: { error?: string }; statusText?: string }; message?: string };
      console.error('获取用户列表失败:', err.message || error);
    });
});
</script>