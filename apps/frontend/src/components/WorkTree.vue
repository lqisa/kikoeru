<template>
  <div class="q-ma-md" style="">
    <q-breadcrumbs gutter="xs" v-if="path.length">
      <q-breadcrumbs-el>
        <q-btn no-caps flat dense size="md" icon="folder" style="height: 30px" @click="path = []"
          >ROOT</q-btn
        >
      </q-breadcrumbs-el>

      <q-breadcrumbs-el v-for="(folderName, index) in path" :key="index" class="cursor-pointer">
        <q-btn
          no-caps
          flat
          dense
          size="md"
          icon="folder"
          style="height: 30px"
          @click="onClickBreadcrumb(index)"
          >{{ folderName }}</q-btn
        >
      </q-breadcrumbs-el>
    </q-breadcrumbs>

    <q-card>
      <q-list separator>
        <q-item
          clickable
          v-ripple
          v-for="(item, index) in fatherFolder"
          :key="index"
          :active="item.type === 'audio' && currentPlayingFile.hash === item.hash"
          active-class="text-white bg-teal"
          @click="onClickItem(item)"
          class="non-selectable"
        >
          <q-item-section avatar>
            <q-icon size="34px" v-if="item.type === 'folder'" color="amber" name="folder" />
            <q-icon size="34px" v-else-if="item.type === 'text'" color="info" name="description" />
            <q-icon size="34px" v-else-if="item.type === 'image'" color="orange" name="photo" />
            <q-icon size="34px" v-else-if="item.type === 'video'" color="red" name="movie" />
            <q-icon size="34px" v-else-if="item.type === 'other'" color="info" name="description" />
            <q-btn
              v-else
              round
              dense
              color="primary"
              :icon="playIcon(item.hash)"
              @click="onClickPlayButton(item.hash)"
            />
          </q-item-section>

          <q-item-section>
            <q-item-label lines="2">{{ item.title }}</q-item-label>
            <q-item-label v-if="item.children" caption lines="1">{{
              `${item.children.length} 项目`
            }}</q-item-label>
          </q-item-section>

          <!-- 上下文菜单 -->
          <q-menu
            v-if="
              item.type === 'audio' ||
              item.type === 'text' ||
              item.type === 'image' ||
              item.type === 'other' ||
              item.type === 'video'
            "
            touch-position
            context-menu
            auto-close
            transition-show="jump-down"
            transition-hide="jump-up"
          >
            <q-list separator>
              <q-item clickable @click="addToQueue(item)" v-if="item.type === 'audio'">
                <q-item-section>添加到播放列表</q-item-section>
              </q-item>

              <q-item clickable @click="playNext(item)" v-if="item.type === 'audio'">
                <q-item-section>下一曲播放</q-item-section>
              </q-item>

              <q-item clickable @click="download(item)">
                <q-item-section>下载文件</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-item>
      </q-list>
    </q-card>

    <VideoPlayer
      v-model="videoDialog.show"
      :url="videoDialog.url"
      :title="videoDialog.title"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import VideoPlayer from './VideoPlayer.vue';
import type { TreeItem, AudioTrack } from '../types';

const props = defineProps<{ tree: TreeItem[] }>();
const $q = useQuasar();
const store = useAudioPlayerStore();

const path = ref<string[]>([]);
const videoDialog = ref({ show: false, url: '', title: '' });

const getToken = (): string => String($q.localStorage.getItem('jwt-token') || '');

const fatherFolder = computed(() => {
  let folder: TreeItem[] = props.tree.concat();
  for (const folderName of path.value) {
    const found = folder.find((item) => item.type === 'folder' && item.title === folderName);
    folder = (found?.children as TreeItem[]) || [];
  }
  return folder;
});

const queue = computed(() => fatherFolder.value.filter((item) => item.type === 'audio'));

const playing = computed(() => store.playing);
const currentPlayingFile = computed(() => store.currentPlayingFile);

const initPath = () => {
  const initialPath: string[] = [];
  let folder: TreeItem[] = props.tree.concat();
  while (folder.length === 1) {
    if (folder[0]?.type !== 'folder') break;
    initialPath.push(folder[0]?.title);
    folder = (folder[0]?.children as TreeItem[]) || [];
  }
  path.value = initialPath;
};

watch(
  () => props.tree,
  () => initPath(),
);
onMounted(() => initPath());

const playIcon = (hash?: string) =>
  playing.value && currentPlayingFile.value.hash === hash ? 'pause' : 'play_arrow';

const onClickBreadcrumb = (index: number) => {
  path.value = path.value.slice(0, index + 1);
};

const onClickItem = (item: TreeItem) => {
  if (item.type === 'folder') {
    path.value.push(item.title);
  } else if (item.type === 'text' || item.type === 'image') {
    openFile(item);
  } else if (item.type === 'other') {
    download(item);
  } else if (item.type === 'video') {
    openVideo(item);
  } else if (currentPlayingFile.value.hash !== item.hash) {
    store.SET_QUEUE({
      queue: queue.value.concat(),
      index: queue.value.findIndex((file) => file.hash === item.hash),
      resetPlaying: true,
    });
  }
};

const onClickPlayButton = (hash?: string) => {
  if (currentPlayingFile.value.hash === hash) {
    store.TOGGLE_PLAYING();
  } else {
    store.SET_QUEUE({
      queue: queue.value.concat(),
      index: queue.value.findIndex((file) => file.hash === hash),
      resetPlaying: true,
    });
  }
};

const addToQueue = (file: TreeItem) => {
  const audioTrack: AudioTrack = {
    hash: file.hash || null,
    title: file.title,
    mediaStreamUrl: file.mediaStreamUrl,
    workTitle: file.workTitle || null,
  };
  store.ADD_TO_QUEUE(audioTrack);
};

const playNext = (file: TreeItem) => {
  const audioTrack: AudioTrack = {
    hash: file.hash || null,
    title: file.title,
    mediaStreamUrl: file.mediaStreamUrl,
    workTitle: file.workTitle || null,
  };
  store.PLAY_NEXT(audioTrack);
};

const download = (file: TreeItem) => {
  const token = getToken();
  const url = file.mediaDownloadUrl
    ? `${file.mediaDownloadUrl}?token=${token}`
    : `/api/media/download/${file.hash}?token=${token}`;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.click();
};

const openFile = (file: TreeItem) => {
  const token = getToken();
  const url = file.mediaStreamUrl
    ? `${file.mediaStreamUrl}?token=${token}`
    : `/api/media/stream/${file.hash}?token=${token}`;
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.click();
};

const openVideo = (file: TreeItem) => {
  const token = getToken();
  const url = file.mediaStreamUrl
    ? `${file.mediaStreamUrl}?token=${token}`
    : `/api/media/stream/${file.hash}?token=${token}`;
  videoDialog.value = { show: true, url, title: file.title };
};
</script>