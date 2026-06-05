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
import { ref, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { setAxiosHeaders } from '../boot/axios';
import { useNotification } from '../composables/useNotification';

const router = useRouter();
const $q = useQuasar();
const $axios = inject<{
  post: (url: string, data: unknown) => Promise<{ data: { token: string } }>;
}>('axios')!;
const { showSuccNotif, showWarnNotif, showErrNotif } = useNotification();

const name = ref('');
const password = ref('');

const onSubmit = () => {
  $axios
    .post('/api/auth/me', { name: name.value, password: password.value })
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
    .catch((error) => {
      if (error.response) {
        if (error.response.status === 401) {
          showWarnNotif(error.response.data.error);
        } else {
          showErrNotif(
            error.response.data.error || `${error.response.status} ${error.response.statusText}`,
          );
        }
      } else {
        showErrNotif(error.message || error);
      }
    });
};
</script>
