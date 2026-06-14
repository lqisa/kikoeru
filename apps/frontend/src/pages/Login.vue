<template>
  <q-form @submit="onSubmit" style="width: 260px" class="absolute-center q-gutter-md">
    <q-input
      filled
      v-model="name"
      label="用户名"
      class="fit"
      lazy-rules
      :rules="[(val) => val.length >= 5 || '密码长度至少为 5']"
    />
    <q-input
      filled
      type="password"
      v-model="password"
      label="密码"
      class="fit"
      lazy-rules
      :rules="[(val) => val.length >= 5 || '密码长度至少为 5']"
    />
    <q-btn label="登录" type="submit" color="primary" class="fit" />
  </q-form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { setAxiosHeaders } from '../boot/axios';
import { useNotification } from '../composables/useNotification';
import { useApi } from '../composables/useApi';
import type { AuthResponse } from '../types';

const router = useRouter();
const $q = useQuasar();
const api = useApi();
const { showSuccNotif, showWarnNotif, showErrNotif } = useNotification();

const name = ref('');
const password = ref('');

const onSubmit = () => {
  api
    .post<AuthResponse>('/api/auth/me', { name: name.value, password: password.value })
    .then((res) => {
      try {
        $q.localStorage.set('jwt-token', res.data.token);
        setAxiosHeaders(res.data.token);
        showSuccNotif('登录成功.');
        router.push('/');
      } catch (error) {
        showErrNotif((error as Error).message);
      }
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
</script>