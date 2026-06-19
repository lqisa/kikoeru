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

    <q-card class="q-ma-md q-mt-sm">
      <q-toolbar>
        <q-toolbar-title>字幕目录</q-toolbar-title>
        <q-btn
          flat
          round
          dense
          icon="add"
          color="primary"
          @click="addSubtitleFolder"
        />
        <q-btn
          flat
          round
          dense
          icon="sync"
          color="teal"
          :loading="scanning"
          @click="initSubtitleScan"
        >
          <q-tooltip>初始化字幕</q-tooltip>
        </q-btn>
      </q-toolbar>
      <q-list v-if="subtitleFolders.length > 0">
        <q-item v-for="folder in subtitleFolders" :key="folder.id">
          <q-item-section>
            <q-item-label>{{ folder.name || folder.path }}</q-item-label>
            <q-item-label caption v-if="folder.name">{{ folder.path }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="red"
              @click="removeSubtitleFolder(folder.id)"
            />
          </q-item-section>
        </q-item>
      </q-list>
      <q-item v-else>
        <q-item-section>
          <q-item-label caption>未配置字幕目录</q-item-label>
        </q-item-section>
      </q-item>
    </q-card>

    <div class="q-ma-lg row justify-end">
      <q-btn label="保存" color="primary" @click="onSubmit" />
    </div>

    <FolderBrowser v-model="showBrowser" @ok="onFolderSelected" />
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApi } from '../../composables/useApi';
import { useNotification } from '../../composables/useNotification';
import FolderBrowser from '../../components/FolderBrowser.vue';
import type { AdminConfigResponse, SubtitleFolder } from '../../types';

const api = useApi();
const { showSuccNotif, showErrNotif } = useNotification();
const rewind = ref(5);
const forward = ref(30);
const subtitleFolders = ref<SubtitleFolder[]>([]);
const scanning = ref(false);
const showBrowser = ref(false);

const onSubmit = () => {
  api
    .put('/api/config/admin', {
      config: { rewindSeekTime: rewind.value, forwardSeekTime: forward.value },
    })
    .then(() => showSuccNotif('保存成功'));
};

const loadSubtitleFolders = async () => {
  try {
    const r = await api.get<{ folders: SubtitleFolder[] }>('/api/subtitle/folders');
    subtitleFolders.value = r.data.folders || [];
  } catch {}
};

const addSubtitleFolder = () => {
  showBrowser.value = true;
};

const onFolderSelected = async (dirPath: string) => {
  try {
    await api.post('/api/subtitle/folders', { path: dirPath });
    showSuccNotif('字幕目录添加成功');
    await loadSubtitleFolders();
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || '添加失败';
    showErrNotif(msg);
  }
};

const removeSubtitleFolder = async (id: number) => {
  try {
    await api.delete(`/api/subtitle/folders/${id}`);
    showSuccNotif('字幕目录已删除');
    await loadSubtitleFolders();
  } catch {
    showErrNotif('删除失败');
  }
};

const initSubtitleScan = async () => {
  scanning.value = true;
  try {
    await api.post('/api/subtitle/scan');
    showSuccNotif('字幕扫描已启动');
  } catch {
    showErrNotif('启动字幕扫描失败');
  } finally {
    scanning.value = false;
  }
};

onMounted(async () => {
  try {
    const r = await api.get<AdminConfigResponse>('/api/config/admin');
    if (r.data && r.data.config) {
      const d = r.data.config;
      if (d.rewindSeekTime) rewind.value = d.rewindSeekTime;
      if (d.forwardSeekTime) forward.value = d.forwardSeekTime;
    }
  } catch {}
  await loadSubtitleFolders();
});
</script>