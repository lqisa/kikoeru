<template>
  <q-page padding>
    <div class="fit row wrap justify-between items-start q-px-sm">
      <div class="col-lg-3 col-sm-12 col-xs-12">
        <q-btn-toggle
          v-model="mode"
          @input="changeMode"
          spread
          no-caps
          rounded
          toggle-color="primary"
          color="white"
          class="text-bold"
          text-color="black"
          :options="[
            { label: '我的评价', value: 'review' },
            { label: '我的进度', value: 'progress' },
            { label: '分类整理', value: 'folder' },
          ]"
        />
      </div>
      <div class="col-auto gt-sm row">
        <q-select
          dense
          rounded
          outlined
          v-model="sortBy"
          :options="sortOptions"
          bg-color="white"
          class="q-mx-sm"
        />
        <q-btn
          :disable="sortButtonDisabled"
          dense
          rounded
          color="white"
          :text-color="sortButtonDisabled ? 'grey' : 'black'"
          :icon="direction ? 'arrow_downward' : 'arrow_upward'"
          @click="switchSortMode"
        />
      </div>
    </div>

    <div class="q-pt-md q-px-sm">
      <q-btn-toggle
        v-if="mode === 'progress'"
        v-model="progressFilter"
        @input="changeProgressFilter"
        toggle-color="primary"
        color="white"
        text-color="black"
        rounded
        :options="[
          { label: '想听', value: 'marked' },
          { label: '在听', value: 'listening' },
          { label: '听过', value: 'listened' },
          { label: '重听', value: 'replay' },
          { label: '搁置', value: 'postponed' },
        ]"
      />
    </div>

    <div class="q-pt-md">
      <div class="q-px-sm q-py-md">
        <q-infinite-scroll
          @load="onLoad"
          :offset="500"
          :disable="stopLoad"
          ref="scroll"
          v-if="mode !== 'folder'"
        >
          <div class="row justify-center text-grey" v-if="works.length === 0">
            在作品界面上点击星标、标记进度，标记的音声就会出现在这里啦
          </div>
          <q-list bordered separator class="shadow-2" v-if="works.length">
            <FavListItem
              v-for="work in works"
              :key="work.id"
              :workid="work.id"
              :metadata="work"
              @reset="reset()"
              :mode="mode"
            />
          </q-list>
          <template #loading>
            <div class="row justify-center q-my-md">
              <q-spinner-dots color="primary" size="40px" />
            </div>
          </template>
        </q-infinite-scroll>
        <div v-else class="row justify-center text-grey">尚未实现，敬请期待</div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import FavListItem from 'components/FavListItem.vue';
import { useNotification } from '../composables/useNotification';
import { useApi } from '../composables/useApi';
import type { WorkMetadata, WorksResponse } from '../types';

const props = defineProps<{ route: string; progress?: string }>();

const api = useApi();
const { showErrNotif } = useNotification();

const mode = ref(props.route || 'review');
const progressFilter = ref(props.progress || 'marked');
const sortBy = ref('date');
const direction = ref(true);
const sortButtonDisabled = ref(true);
const stopLoad = ref(false);
const works = ref<WorkMetadata[]>([]);
const page = ref(1);

const sortOptions = ['date', 'rating', 'title'];

const switchSortMode = () => {
  direction.value = !direction.value;
};

const changeMode = () => {
  stopLoad.value = true;
  works.value = [];
  page.value = 1;
  stopLoad.value = false;
};

const changeProgressFilter = () => {
  changeMode();
};

const reset = () => {
  changeMode();
};

const onLoad = (_index: number, done: () => void) => {
  requestWorks().then(() => done());
};

const requestWorks = () => {
  const apiUrl =
    mode.value === 'review' ? '/api/review/user' : `/api/progress/${progressFilter.value}`;

  return api
    .get<WorksResponse>(apiUrl, { params: { page: page.value } })
    .then((response) => {
      const data = response.data;
      works.value = page.value === 1 ? data.works : works.value.concat(data.works);
      page.value++;
    })
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: { error?: string }; statusText?: string }; message?: string };
      if (err.response && err.response.status !== 401) {
        showErrNotif(
          err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
        );
      } else if (!err.response) showErrNotif(err.message || String(error));
      stopLoad.value = true;
    });
};

onMounted(() => requestWorks());
</script>