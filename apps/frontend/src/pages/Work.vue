<template>
  <div>
    <WorkDetails :metadata="metadata" :work-dir="workDir" @reset="requestData()" />
    <WorkTree :tree="tree" :editable="false" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import WorkDetails from 'components/WorkDetails.vue';
import WorkTree from 'components/WorkTree.vue';
import { useNotification } from '../composables/useNotification';
import { useApi } from '../composables/useApi';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import { getPlaybackState, clearPlaybackState } from '../stores/audioPlayer/actions';
import type { WorkMetadata, TreeItem, AdminConfigResponse } from '../types';

const route = useRoute();
const $q = useQuasar();
const api = useApi();
const { showErrNotif } = useNotification();
const audioStore = useAudioPlayerStore();

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

const flattenAudioItems = (items: TreeItem[]): TreeItem[] => {
  const result: TreeItem[] = [];
  for (const item of items) {
    if (item.type === 'audio') {
      result.push(item);
    }
    if (item.children) {
      result.push(...flattenAudioItems(item.children));
    }
  }
  return result;
};

let resumeNotif: ReturnType<typeof $q.notify> | null = null;

const checkPlaybackResume = () => {
  const state = getPlaybackState();
  if (!state) return;
  if (String(state.workId) !== String(workid.value)) return;

  const currentTrack = audioStore.queue[audioStore.queueIndex];
  if (currentTrack?.hash && currentTrack.hash.startsWith(state.workId)) return;

  const timeStr = formatTime(state.currentTime);
  resumeNotif = $q.notify({
    message: `检测到上次播放进度：${state.audioTitle}（${timeStr}）`,
    color: 'dark',
    timeout: 0,
    actions: [
      { label: '恢复', color: 'teal', handler: () => resumePlayback(state) },
      { label: '取消', color: 'grey', handler: () => clearPlaybackState() },
    ],
  });
};

const resumePlayback = (state: { workId: string; audioTitle: string; currentTime: number }) => {
  const allAudio = flattenAudioItems(tree.value);
  const matchTrack = allAudio.find((item) => item.title === state.audioTitle);

  if (matchTrack) {
    const queue = allAudio.map((item) => ({
      hash: item.hash || null,
      title: item.title,
      workTitle: item.workTitle || metadata.value.title,
      mediaStreamUrl: item.mediaStreamUrl,
    }));
    const index = allAudio.findIndex((item) => item.title === state.audioTitle);
    audioStore.SET_QUEUE({ queue, index, resetPlaying: true });
    setTimeout(() => {
      audioStore.SEEK_TO(state.currentTime);
    }, 500);
  } else {
    $q.notify({ message: '未找到对应音频文件', color: 'warning' });
  }
  clearPlaybackState();
  resumeNotif = null;
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

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
      checkPlaybackResume();
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

onBeforeUnmount(() => {
  if (resumeNotif) {
    resumeNotif();
    resumeNotif = null;
  }
});
</script>