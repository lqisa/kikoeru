<template>
  <div>
    <WorkDetails :metadata="metadata" @reset="requestData()" />
    <WorkTree :tree="tree" :editable="false" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, inject } from 'vue';
import { useRoute } from 'vue-router';
import WorkDetails from 'components/WorkDetails.vue';
import WorkTree from 'components/WorkTree.vue';
import { useNotification } from '../composables/useNotification';
import type { WorkMetadata, TreeItem } from '../types';

const route = useRoute();
const $axios = inject<{
  get: (url: string) => Promise<{ data: WorkMetadata | TreeItem[] }>;
}>('axios')!;
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

const requestData = () => {
  $axios
    .get(`/api/work/${workid.value}`)
    .then((response) => {
      metadata.value = response.data as WorkMetadata;
    })
    .catch((error) => {
      if (error.response) {
        showErrNotif(
          error.response.data.error || `${error.response.status} ${error.response.statusText}`,
        );
      } else {
        showErrNotif(error.message || error);
      }
    });

  $axios
    .get(`/api/tracks/${workid.value}`)
    .then((response) => {
      tree.value = response.data as TreeItem[];
    })
    .catch((error) => {
      if (error.response) {
        showErrNotif(
          error.response.data.error || `${error.response.status} ${error.response.statusText}`,
        );
      } else {
        showErrNotif(error.message || error);
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
