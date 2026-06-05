<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card>
      <div class="q-pa-sm">
        <q-time v-model="time" now-btn :dark="store.sleepMode" />
      </div>

      <div class="row justify-between">
        <q-card-actions>
          <q-btn
            flat
            label="取消定时"
            color="primary"
            @click="clearSleepTimer"
            :disable="!store.sleepMode"
            v-close-popup
          />
        </q-card-actions>

        <q-card-actions align="right">
          <q-btn flat label="取消" color="primary" v-close-popup />
          <q-btn flat label="确定" color="primary" @click="setSleepTimer" v-close-popup />
        </q-card-actions>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import { useNotification } from '../composables/useNotification';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const $q = useQuasar();
const store = useAudioPlayerStore();
const { showSuccNotif } = useNotification();

const time = ref('00:00');

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

// Lifecycle
onMounted(() => {
  try {
    if ($q.sessionStorage.getItem('sleepMode')) {
      const sleepTime = $q.sessionStorage.getItem('sleepTime');
      if (typeof sleepTime === 'string') {
        store.SET_SLEEP_TIMER(sleepTime);
      }
    }
  } catch {
    console.log('Web Storage API error');
  }
});

// Watchers
watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      if (!store.sleepMode) {
        const currentTime = new Date();
        time.value =
          currentTime.getHours().toString().padStart(2, '0') +
          ':' +
          currentTime.getMinutes().toString().padStart(2, '0');
      } else {
        time.value = store.sleepTime || '00:00';
      }
    }
  },
);

// Methods
const setSleepTimer = () => {
  store.SET_SLEEP_TIMER(time.value);
  try {
    $q.sessionStorage.set('sleepTime', time.value);
    $q.sessionStorage.set('sleepMode', true);
  } catch {
    console.log('Web Storage API error');
  }
  showSuccNotif(`将于${time.value}停止播放`);
};

const clearSleepTimer = () => {
  store.CLEAR_SLEEP_MODE();
  try {
    $q.sessionStorage.set('sleepTime', null);
    $q.sessionStorage.set('sleepMode', false);
  } catch {
    console.log('Web Storage API error');
  }
  showSuccNotif('已关闭睡眠模式');
};
</script>
