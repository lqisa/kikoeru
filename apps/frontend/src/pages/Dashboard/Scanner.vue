<template>
  <div>
    <div class="row q-ma-sm">
      <div class="col-xs-6 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          color="teal"
          label="扫描本地音声库"
          :disable="state === 'running' || !connected"
          @click="scan()"
        />
      </div>
      <div class="col-xs-6 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          color="primary"
          label="刷新音声库"
          :disable="state === 'running' || !connected"
          @click="update()"
        />
      </div>
      <div class="col-xs-12 col-sm-4 row q-pa-sm">
        <q-btn
          class="col"
          color="negative"
          label="终止扫描"
          :disable="state !== 'running' || !connected"
          @click="kill()"
        />
      </div>
    </div>

    <q-card v-show="state" class="q-ma-md">
      <q-expansion-item expand-separator>
        <template #header>
          <q-item-section avatar>
            <q-spinner-gears v-if="state === 'running'" color="primary" size="2em" />
            <q-icon v-else-if="state === 'finished'" name="done" color="positive" size="2em" />
            <q-icon v-else name="bug_report" color="red" size="2em" />
          </q-item-section>
          <q-item-section>
            <q-item-label v-if="allLogs.length">{{
              allLogs[allLogs.length - 1]?.message
            }}</q-item-label>
          </q-item-section>
        </template>
        <q-scroll-area style="height: 256px" class="bg-dark text-white q-pa-md">
          <div v-for="(l, i) in allLogs" :key="i">
            <span :class="l.level === 'error' ? 'text-red' : ''">{{ l.message }}</span>
          </div>
        </q-scroll-area>
      </q-expansion-item>
    </q-card>

    <q-card v-show="tasks.length > 0 || failedTasks.length > 0" class="q-ma-md">
      <q-tabs
        v-model="tab"
        dense
        inline-label
        class="text-grey"
        active-color="white"
        active-bg-color="brown"
        indicator-color="yellow"
        align="justify"
        narrow-indicator
      >
        <q-tab name="tasks" icon="hourglass_full" label="处理中">
          <q-badge v-show="tasks.length > 0" color="primary" floating>{{ tasks.length }}</q-badge>
        </q-tab>
        <q-tab name="failedTasks" icon="error_outline" label="处理失败">
          <q-badge v-show="failedTasks.length > 0" color="red" floating>{{
            failedTasks.length
          }}</q-badge>
        </q-tab>
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tab" animated>
        <q-tab-panel name="tasks" class="q-pa-none">
          <q-virtual-scroll
            separator
            style="max-height: 313px"
            :items="tasks"
            :virtual-scroll-item-size="52"
          >
            <template #default="{ item, index }">
              <q-expansion-item expand-separator :key="index">
                <template #header>
                  <q-item-section avatar>
                    <q-spinner-hourglass color="primary" size="2em" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label v-if="item.logs && item.logs.length > 0" class="ellipsis">
                      {{ item.logs[item.logs.length - 1].message }}
                    </q-item-label>
                    <q-item-label caption>{{ `RJ${item.rjcode}` }}</q-item-label>
                  </q-item-section>
                </template>
                <q-card>
                  <q-card-section class="bg-dark text-white">
                    <div v-for="(log, logIndex) in item.logs" :key="logIndex">
                      <span :class="log.level === 'error' ? 'text-red' : ''"
                        >➜ {{ log.message }}</span
                      >
                    </div>
                  </q-card-section>
                </q-card>
              </q-expansion-item>
            </template>
          </q-virtual-scroll>
        </q-tab-panel>

        <q-tab-panel name="failedTasks" class="q-pa-none">
          <q-virtual-scroll
            separator
            style="max-height: 313px"
            :items="failedTasks"
            :virtual-scroll-item-size="52"
          >
            <template #default="{ item, index }">
              <q-expansion-item
                expand-separator
                :key="index"
                expand-icon-class="text-white"
                header-class="bg-negative"
              >
                <template #header>
                  <q-item-section avatar>
                    <q-icon name="bug_report" color="white" size="2em" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-white ellipsis">
                      {{ item.logs[item.logs.length - 1].message }}
                    </q-item-label>
                    <q-item-label caption class="text-white">
                      {{ `RJ${item.rjcode}` }}
                    </q-item-label>
                  </q-item-section>
                </template>
                <q-card>
                  <q-card-section class="bg-dark text-white">
                    <div v-for="(log, logIndex) in item.logs" :key="logIndex">
                      <span :class="log.level === 'error' ? 'text-red' : ''"
                        >➜ {{ log.message }}</span
                      >
                    </div>
                  </q-card-section>
                </q-card>
              </q-expansion-item>
            </template>
          </q-virtual-scroll>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSocket } from '../../composables/useSocket';
import type { ScanTask, ScanResult, ScanLog } from '../../types';

const { registerEvent, emit, isConnected } = useSocket();

const tab = ref('tasks');
const state = ref('');
const connected = ref(false);
const tasks = ref<ScanTask[]>([]);
const failedTasks = ref<ScanTask[]>([]);
const logs = ref<ScanLog[]>([]);
const results = ref<ScanResult[]>([]);

registerEvent('SCAN_TASKS', (payload: { tasks: ScanTask[] }) => {
  tasks.value = payload.tasks || [];
});

registerEvent('SCAN_FAILED_TASKS', (payload: { failedTasks: ScanTask[] }) => {
  failedTasks.value = payload.failedTasks || [];
});

registerEvent('SCAN_RESULTS', (payload: { results: ScanResult[] }) => {
  results.value = payload.results || [];
});

registerEvent('SCAN_INIT_STATE', (payload: {
  mainLogs: ScanLog[];
  tasks: ScanTask[];
  failedTasks: ScanTask[];
  results: ScanResult[];
}) => {
  state.value = 'running';
  logs.value = payload.mainLogs || [];
  tasks.value = payload.tasks || [];
  failedTasks.value = payload.failedTasks || [];
  results.value = payload.results || [];
});

registerEvent('SCAN_MAIN_LOGS', (payload: { mainLogs: ScanLog[] }) => {
  logs.value = payload.mainLogs || [];
});

registerEvent('SCAN_FINISHED', (payload: { message: string }) => {
  state.value = 'finished';
  logs.value.push({
    level: 'info',
    message: payload.message,
  });
});

registerEvent('SCAN_ERROR', () => {
  state.value = 'error';
});

registerEvent('success', () => {
  // 登录成功标记
});

registerEvent('connect', () => {
  connected.value = true;
});

registerEvent('disconnect', () => {
  connected.value = false;
});

registerEvent('connect_error', () => {
  connected.value = false;
});

const allLogs = computed(() => {
  const resultLogs = results.value.map((res) => {
    if (res.result === 'added') {
      return { level: 'info', message: `[RJ${res.rjcode}] 添加成功! Added: ${res.count}` };
    } else if (res.result === 'updated') {
      return { level: 'info', message: `[RJ${res.rjcode}] 更新成功! Updated: ${res.count}` };
    } else {
      return { level: 'error', message: `[RJ${res.rjcode}] 处理失败! Failed: ${res.count}` };
    }
  });
  return logs.value.concat(resultLogs);
});

const scan = () => {
  tasks.value = [];
  failedTasks.value = [];
  logs.value = [];
  results.value = [];
  state.value = 'running';
  emit('PERFORM_SCAN');
};

const update = () => {
  tasks.value = [];
  failedTasks.value = [];
  logs.value = [];
  results.value = [];
  state.value = 'running';
  emit('PERFORM_UPDATE');
};

const kill = () => emit('KILL_SCAN_PROCESS');

onMounted(() => {
  connected.value = isConnected();
  emit('ON_SCANNER_PAGE');
});
</script>