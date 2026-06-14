<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    maximized
    transition-show="scale"
    transition-hide="scale"
  >
    <q-card class="bg-dark video-player-card">
      <q-bar class="bg-dark text-white">
        <q-icon name="movie" size="sm" />
        <div class="text-subtitle2 q-ml-sm ellipsis" style="max-width: 70vw">{{ title }}</div>
        <q-space />
        <q-btn dense flat icon="close" @click="$emit('update:modelValue', false)">
          <q-tooltip>关闭</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section class="q-pa-none column items-center justify-center video-container">
        <video ref="videoEl" crossorigin="anonymous" playsinline>
          <source v-if="source" :src="source" type="video/mp4" />
        </video>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useQuasar } from 'quasar';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

const props = defineProps<{
  modelValue: boolean;
  url: string;
  title: string;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const $q = useQuasar();
const videoEl = ref<HTMLVideoElement>();
let player: Plyr | null = null;

const getToken = (): string => String($q.localStorage.getItem('jwt-token') || '');

const source = computed(() => {
  const token = getToken();
  return props.url ? `${props.url}?token=${token}` : '';
});

const initPlayer = () => {
  if (!videoEl.value || player) return;
  player = new Plyr(videoEl.value, {
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'mute',
      'volume',
      'settings',
      'fullscreen',
    ],
  });
};

const destroyPlayer = () => {
  if (player) {
    player.destroy();
    player = null;
  }
};

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await nextTick();
      initPlayer();
    } else {
      destroyPlayer();
    }
  },
);

onBeforeUnmount(() => {
  destroyPlayer();
});
</script>

<style lang="scss" scoped>
.video-player-card {
  width: 100%;
  height: 100%;
}

.video-container {
  height: calc(100% - 32px);

  video {
    max-width: 100%;
    max-height: 100%;
  }
}
</style>