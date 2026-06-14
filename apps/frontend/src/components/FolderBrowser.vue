<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" @show="onDialogShow">
    <q-card style="min-width: 500px; height: 60vh" class="column">
      <q-toolbar>
        <q-toolbar-title>选择目录</q-toolbar-title>
        <q-btn flat round dense icon="close" @click="onDialogCancel" />
      </q-toolbar>

      <div class="q-px-md q-py-sm">
        <q-breadcrumbs active-color="primary">
          <q-breadcrumbs-el
            label="根"
            @click="browse()"
            class="cursor-pointer"
          />
          <q-breadcrumbs-el
            v-for="(segment, i) in pathSegments"
            :key="i"
            :label="segment.name"
            @click="browse(segment.path)"
            class="cursor-pointer"
          />
        </q-breadcrumbs>
      </div>

      <q-separator />

      <q-scroll-area class="col" style="height: 40vh">
        <q-list>
          <q-item
            v-if="currentPath"
            clickable
            @click="browse(parentPath)"
          >
            <q-item-section avatar>
              <q-icon name="arrow_upward" />
            </q-item-section>
            <q-item-section>
              <q-item-label>..</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-for="dir in dirs"
            :key="dir.path"
            clickable
            @click="browse(dir.path)"
            @dblclick="selectDir(dir.path)"
          >
            <q-item-section avatar>
              <q-icon color="amber" name="folder" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ dir.name }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item v-if="!loading && dirs.length === 0">
            <q-item-section>
              <q-item-label caption>无子目录</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-inner-loading :showing="loading">
          <q-spinner size="40px" color="primary" />
        </q-inner-loading>
      </q-scroll-area>

      <q-separator />

      <q-card-actions align="right">
        <q-btn flat label="取消" @click="onDialogCancel" />
        <q-btn
          color="primary"
          label="选择此目录"
          :disable="!currentPath"
          @click="selectDir(currentPath)"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDialogPluginComponent } from 'quasar';
import { useApi } from '../composables/useApi';
import { useNotification } from '../composables/useNotification';
import type { BrowseDirItem, BrowseResponse } from '../types';

defineEmits({ ...useDialogPluginComponent.emitsObject });

const { dialogRef, onDialogHide: emitHide, onDialogOK, onDialogCancel } = useDialogPluginComponent();
const api = useApi();
const { showErrNotif } = useNotification();

const currentPath = ref('');
const dirs = ref<BrowseDirItem[]>([]);
const loading = ref(false);

const pathSegments = computed(() => {
  if (!currentPath.value) return [];
  const parts = currentPath.value.split(/[/\\]/).filter(Boolean);
  const segments: { name: string; path: string }[] = [];
  let built = currentPath.value.match(/^[/\\]/) ? '/' : '';
  for (const part of parts) {
    built = built ? built + '/' + part : part;
    if (built.match(/^[A-Za-z]:$/)) built += '/';
    segments.push({ name: part, path: built });
  }
  return segments;
});

const parentPath = computed(() => {
  if (!currentPath.value) return '';
  const sep = currentPath.value.includes('\\') ? '\\' : '/';
  const parts = currentPath.value.replace(/[\\/]$/, '').split(sep);
  parts.pop();
  let parent = parts.join(sep);
  if (currentPath.value.match(/^[A-Za-z]:\\/)) {
    if (!parent.endsWith('\\') && parent.length === 2) parent += '\\';
  }
  return parent;
});

const browse = (dirPath?: string) => {
  loading.value = true;
  const params: { path?: string } = {};
  if (dirPath) params.path = dirPath;

  api
    .get<BrowseResponse>('/api/config/browse', { params })
    .then((response) => {
      currentPath.value = response.data.currentPath;
      dirs.value = response.data.dirs;
    })
    .catch((error: unknown) => {
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      showErrNotif(err.response?.data?.error || err.message || '浏览目录失败');
    })
    .finally(() => {
      loading.value = false;
    });
};

const selectDir = (dirPath: string) => {
  onDialogOK(dirPath);
};

const onDialogHide = () => {
  currentPath.value = '';
  dirs.value = [];
  emitHide();
};

const onDialogShow = () => {
  browse();
};
</script>