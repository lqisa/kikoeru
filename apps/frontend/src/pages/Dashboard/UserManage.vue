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
import { ref, onMounted, inject } from 'vue';

const $axios = inject<any>('axios')!;
const users = ref<any[]>([]);

onMounted(() => {
  $axios
    .get('/api/credentials/users')
    .then((r: any) => {
      users.value = r.data.users || [];
    })
    .catch((error: any) => {
      console.error('获取用户列表失败:', error);
    });
});
</script>
