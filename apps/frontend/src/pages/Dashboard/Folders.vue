<template>
  <div>
    <q-card class="q-ma-md"
      ><q-form @submit="onSubmitRootFolder"
        ><q-toolbar><q-toolbar-title>添加新文件夹</q-toolbar-title></q-toolbar>
        <div class="q-pa-sm">
          <q-input
            outlined
            dense
            v-model="rootFolder.name"
            required
            lazy-rules
            :rules="[(v: string) => !config.rootFolders.find((f: any) => f.name === v) || '已存在']"
            label="文件夹别名"
          /><q-input
            outlined
            dense
            v-model="rootFolder.path"
            required
            lazy-rules
            :rules="[(v: string) => !config.rootFolders.find((f: any) => f.path === v) || '已存在']"
            label="绝对路径"
          />
          <div class="row justify-end">
            <q-btn type="submit" color="primary" label="添加" />
          </div>
        </div> </q-form></q-card
    ><q-form @submit="onSubmit"
      ><q-card class="q-ma-md" v-show="config.rootFolders.length"
        ><q-toolbar><q-toolbar-title>文件夹列表</q-toolbar-title></q-toolbar
        ><q-list
          ><q-item v-for="(rf, i) in config.rootFolders" :key="rf.name"
            ><q-item-section avatar><q-icon color="amber" name="folder" /></q-item-section
            ><q-item-section
              ><q-item-label>{{ rf.name }}</q-item-label
              ><q-item-label caption>{{ rf.path }}</q-item-label></q-item-section
            ><q-item-section avatar
              ><q-btn
                flat
                round
                color="red"
                icon="delete"
                @click="remove(i)" /></q-item-section></q-item></q-list
      ></q-card>
      <div class="q-ma-lg row justify-end">
        <q-btn :loading="loading" label="保存" type="submit" color="primary" />
      </div>
    </q-form>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
const $axios = inject<any>('axios')!;
const config = ref({ rootFolders: [] as any[] });
const rootFolder = ref({ name: '', path: '' });
const loading = ref(false);
const onSubmitRootFolder = () => {
  config.value.rootFolders.push({ ...rootFolder.value });
  rootFolder.value = { name: '', path: '' };
};
const remove = (i: number) => {
  config.value.rootFolders.splice(i, 1);
};
const onSubmit = () => {
  $axios.put('/api/config/admin', { config: config.value });
};
onMounted(() => {
  $axios.get('/api/config/admin').then((r: any) => {
    config.value = r.data.config;
  });
});
</script>
