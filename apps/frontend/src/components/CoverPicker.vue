<template>
  <q-dialog v-model="dialogVisible" @hide="$emit('hide')">
    <q-card style="min-width: 600px; height: 70vh" class="column">
      <q-toolbar>
        <q-toolbar-title>选择封面图片</q-toolbar-title>
        <q-btn flat round dense icon="close" @click="dialogVisible = false" />
      </q-toolbar>

      <div class="q-px-md q-py-sm">
        <q-breadcrumbs active-color="primary">
          <q-breadcrumbs-el
            :label="rootName"
            class="cursor-pointer"
            @click="browse(rootPathValue)"
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

      <q-scroll-area class="col" style="height: 45vh">
        <q-list>
          <q-item
            v-if="currentPath !== rootPathValue"
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
          >
            <q-item-section avatar>
              <q-icon color="amber" name="folder" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ dir.name }}</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            v-for="file in files"
            :key="file.path"
            clickable
            :active="selectedPath === file.path"
            active-class="bg-blue-1"
            @click="selectFile(file)"
          >
            <q-item-section avatar>
              <q-icon color="teal" name="image" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ file.name }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="visibility"
                size="sm"
                @click.stop="previewFile(file)"
              />
            </q-item-section>
          </q-item>

          <q-item v-if="!loading && dirs.length === 0 && files.length === 0">
            <q-item-section>
              <q-item-label caption>无图片文件或子目录</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-inner-loading :showing="loading">
          <q-spinner size="40px" color="primary" />
        </q-inner-loading>
      </q-scroll-area>

      <q-separator />

      <div v-if="selectedPath" class="q-pa-sm text-body2 text-grey-7">
        已选择: {{ selectedName }}
      </div>

      <q-card-actions align="right">
        <q-btn flat label="取消" @click="dialogVisible = false" />
        <q-btn
          color="primary"
          label="设为封面"
          :disable="!selectedPath"
          @click="confirm"
        />
      </q-card-actions>

      <q-dialog v-model="showPreview">
        <q-card style="max-width: 80vw; max-height: 80vh">
          <q-toolbar>
            <q-toolbar-title>{{ previewName }}</q-toolbar-title>
            <q-btn flat round dense icon="close" @click="showPreview = false" />
          </q-toolbar>
          <q-img
            :src="previewUrl"
            fit="contain"
            style="max-width: 80vw; max-height: 70vh"
          />
        </q-card>
      </q-dialog>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useApi } from '../composables/useApi';
import { useNotification } from '../composables/useNotification';
import type { BrowseFileItem, BrowseFilesResponse } from '../types';

const emit = defineEmits<{
  (e: 'ok', path: string): void;
  (e: 'hide'): void;
}>();

const props = withDefaults(defineProps<{
  rootPath?: string;
  rootName?: string;
}>(), {
  rootPath: '',
  rootName: '根目录',
});

const dialogVisible = ref(true);
const api = useApi();
const { showErrNotif } = useNotification();

const currentPath = ref(props.rootPath || '');
const dirs = ref<BrowseFileItem[]>([]);
const files = ref<BrowseFileItem[]>([]);
const loading = ref(false);
const selectedPath = ref('');
const showPreview = ref(false);
const previewUrl = ref('');
const previewName = ref('');

const rootPathValue = computed(() => props.rootPath || '');

const pathSegments = computed(() => {
  if (!currentPath.value || currentPath.value === rootPathValue.value) return [];
  const rootParts = rootPathValue.value.replace(/[\\/]$/, '').split(/[/\\]/);
  const curParts = currentPath.value.replace(/[\\/]$/, '').split(/[/\\]/);
  const segments: { name: string; path: string }[] = [];
  let built = rootPathValue.value.replace(/[\\/]$/, '');
  for (let i = rootParts.length; i < curParts.length; i++) {
      const sep = currentPath.value.includes('\\') ? '\\' : '/';
      const part = curParts[i];
      if (!part) continue;
      built += sep + part;
      segments.push({ name: part, path: built });
    }
  return segments;
});

const parentPath = computed(() => {
  if (!currentPath.value || currentPath.value === rootPathValue.value) return rootPathValue.value;
  const sep = currentPath.value.includes('\\') ? '\\' : '/';
  const parts = currentPath.value.replace(/[\\/]$/, '').split(sep);
  parts.pop();
  let parent = parts.join(sep);
  if (currentPath.value.match(/^[A-Za-z]:\\/)) {
    if (!parent.endsWith('\\') && parent.length === 2) parent += '\\';
  }
  if (!parent.startsWith(rootPathValue.value.replace(/[\\/]$/, ''))) {
    return rootPathValue.value;
  }
  return parent;
});

const selectedName = computed(() => {
  if (!selectedPath.value) return '';
  const sep = selectedPath.value.includes('\\') ? '\\' : '/';
  return selectedPath.value.split(sep).pop() || '';
});

const selectFile = (file: BrowseFileItem) => {
  selectedPath.value = file.path;
};

const previewFile = (file: BrowseFileItem) => {
  const token = window.localStorage.getItem('jwt-token') || '';
  previewUrl.value = `/api/config/preview-image?path=${encodeURIComponent(file.path)}&token=${token}`;
  previewName.value = file.name;
  showPreview.value = true;
};

const browse = (dirPath?: string) => {
  loading.value = true;
  const targetPath = dirPath || rootPathValue.value;

  api
    .get<BrowseFilesResponse>('/api/config/browse-files', {
      params: { path: targetPath },
    })
    .then((response) => {
      currentPath.value = response.data.currentPath;
      dirs.value = response.data.dirs;
      files.value = response.data.files;
    })
    .catch((error: unknown) => {
      const err = error as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      showErrNotif(err.response?.data?.error || err.message || '浏览目录失败');
    })
    .finally(() => {
      loading.value = false;
    });
};

const confirm = () => {
  if (selectedPath.value) {
    emit('ok', selectedPath.value);
    dialogVisible.value = false;
  }
};

watch(
  () => [props.rootPath, dialogVisible.value],
  ([newPath, visible]) => {
    if (newPath && visible) {
      browse(newPath as string);
    }
  },
  { immediate: true },
);
</script>