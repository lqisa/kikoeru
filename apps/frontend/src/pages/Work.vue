<template>
  <div>
    <WorkDetails :metadata="metadata" :work-dir="workDir" @reset="requestData()" />
    <WorkTree :tree="tree" :editable="false" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import WorkDetails from 'components/WorkDetails.vue';
import WorkTree from 'components/WorkTree.vue';
import { useNotification } from '../composables/useNotification';
import { useApi } from '../composables/useApi';
import type { WorkMetadata, TreeItem, AdminConfigResponse } from '../types';

const route = useRoute();
const api = useApi();
const { showErrNotif } = useNotification();

const workid = ref(route.params.id);
const metadata = ref<WorkMetadata>({
  id: parseInt(route.params.id as string),
  title: '',
  circle: { id: 0, name: '' },
  release: '',
  rate_average_2dp: 0,
  rate_count: 0,
  review_count: 0,
  price: 0,
  dl_count: 0,
  nsfw: false,
  tags: [],
  vas: [],
});
const tree = ref<TreeItem[]>([]);
const workDir = ref('');

const fetchWorkDir = () => {
  if (!metadata.value.root_folder || !metadata.value.dir) return;
  api
    .get<AdminConfigResponse>('/api/config/admin')
    .then((response) => {
      const rootFolder = response.data.config.rootFolders?.find(
        (rf) => rf.name === metadata.value.root_folder,
      );
      if (rootFolder) {
        const dir = metadata.value.dir || '';
        const sep = rootFolder.path.includes('\\') ? '\\' : '/';
        workDir.value = rootFolder.path + (dir ? sep + dir.replace(/[/\\]/g, sep) : '');
      }
    })
    .catch(() => {});
};

const requestData = () => {
  api
    .get<WorkMetadata>(`/api/work/${workid.value}`)
    .then((response) => {
      metadata.value = response.data;
      fetchWorkDir();
    })
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: { error?: string }; statusText?: string }; message?: string };
      if (err.response) {
        showErrNotif(
          err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
        );
      } else {
        showErrNotif(err.message || String(error));
      }
    });

  api
    .get<TreeItem[]>(`/api/tracks/${workid.value}`)
    .then((response) => {
      tree.value = response.data;
    })
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: { error?: string }; statusText?: string }; message?: string };
      if (err.response) {
        showErrNotif(
          err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
        );
      } else {
        showErrNotif(err.message || String(error));
      }
    });
};

watch(
  () => route.params.id,
  (to) => {
    workid.value = to;
    requestData();
  },
);

onMounted(() => requestData());
</script>