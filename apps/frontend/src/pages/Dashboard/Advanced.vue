<template>
  <div>
    <q-card class="q-ma-md"
      ><q-toolbar><q-toolbar-title>播放器设置</q-toolbar-title></q-toolbar
      ><q-list
        ><q-item style="height: 70px"
          ><q-item-section><q-item-label>后退秒数</q-item-label></q-item-section
          ><q-item-section avatar
            ><div class="q-gutter-sm">
              <q-radio dense v-model="rewind" :val="5" label="5秒" /><q-radio
                dense
                v-model="rewind"
                :val="10"
                label="10秒"
              /><q-radio
                dense
                v-model="rewind"
                :val="30"
                label="30秒"
              /></div></q-item-section></q-item
        ><q-item
          ><q-item-section><q-item-label>前进秒数</q-item-label></q-item-section
          ><q-item-section avatar
            ><div class="q-gutter-sm">
              <q-radio dense v-model="forward" val="5" label="5秒" /><q-radio
                dense
                v-model="forward"
                val="10"
                label="10秒"
              /><q-radio
                dense
                v-model="forward"
                val="30"
                label="30秒"
              /></div></q-item-section></q-item></q-list
    ></q-card>
    <div class="q-ma-lg row justify-end">
      <q-btn label="保存" color="primary" @click="onSubmit" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useNotification } from '../../composables/useNotification';
const $axios = inject<any>('axios')!;
const { showSuccNotif } = useNotification();
const rewind = ref(5);
const forward = ref(30);
const onSubmit = () => {
  $axios
    .put('/api/config/admin', {
      config: { rewindSeekTime: rewind.value, forwardSeekTime: forward.value },
    })
    .then(() => showSuccNotif('保存成功'));
};
onMounted(async () => {
  try {
    const r = await $axios.get('/api/config/admin');
    if (r.data && r.data.config) {
      const d = r.data.config;
      if (d.rewindSeekTime) rewind.value = d.rewindSeekTime;
      if (d.forwardSeekTime) forward.value = d.forwardSeekTime;
    }
  } catch {}
});
</script>
