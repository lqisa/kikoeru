<template>
  <div>
    <div class="text-h5 text-weight-regular q-ma-md">
      {{ pageTitle }}
      <span v-show="pagination.totalCount"> ({{ pagination.totalCount }}) </span>
    </div>

    <div :class="`row justify-center ${listMode ? 'list' : 'q-mx-md'}`">
      <q-infinite-scroll
        @load="onLoad"
        :offset="250"
        :disable="stopLoad"
        style="max-width: 1680px"
        class="col"
      >
        <div v-show="works.length" class="row justify-between q-mb-md q-mr-sm">
          <q-select
            dense
            rounded
            outlined
            bg-color="white"
            transition-show="scale"
            transition-hide="scale"
            v-model="sortOption"
            :options="options"
            label="排序"
            class="col-auto"
          />
          <q-btn-toggle
            dense
            spread
            rounded
            v-model="listMode"
            toggle-color="primary"
            color="white"
            text-color="primary"
            :options="[
              { icon: 'apps', value: false },
              { icon: 'list', value: true },
            ]"
            style="width: 85px"
            class="col-auto"
          />
          <q-btn-toggle
            dense
            spread
            rounded
            v-model="showLabel"
            toggle-color="primary"
            color="white"
            text-color="primary"
            :options="[
              { icon: 'label', value: true },
              { icon: 'label_off', value: false },
            ]"
            style="width: 85px"
            class="col-auto"
            v-if="$q.screen.width > 700 && listMode"
          />
          <q-btn-toggle
            dense
            spread
            rounded
            :disable="$q.screen.width < 1120"
            v-model="detailMode"
            toggle-color="primary"
            color="white"
            text-color="primary"
            :options="[
              { icon: 'zoom_in', value: true },
              { icon: 'zoom_out', value: false },
            ]"
            style="width: 85px"
            class="col-auto"
            v-if="$q.screen.width > 700 && !listMode"
          />
        </div>

        <q-list v-if="listMode" bordered separator class="shadow-2">
          <WorkListItem
            v-for="work in works"
            :key="work.id"
            :metadata="work"
            :show-label="showLabel && $q.screen.width > 700"
          />
        </q-list>

        <div v-else class="row q-col-gutter-x-md q-col-gutter-y-lg">
          <div
            class="col-xs-12 col-sm-6 col-md-4"
            :class="detailMode ? 'col-lg-3 col-xl-3' : 'col-lg-2 col-xl-2'"
            v-for="work in works"
            :key="work.id"
          >
            <WorkCard :metadata="work" :thumbnail-mode="!detailMode" class="fit" />
          </div>
        </div>

        <div v-show="stopLoad" class="q-mt-lg q-mb-xl text-h6 text-bold text-center">END</div>
        <template #loading>
          <div class="row justify-center q-my-md">
            <q-spinner-dots color="primary" size="40px" />
          </div>
        </template>
      </q-infinite-scroll>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onActivated, onDeactivated, nextTick } from 'vue';
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { useQuasar } from 'quasar';
import WorkCard from 'components/WorkCard.vue';
import WorkListItem from 'components/WorkListItem.vue';
import { useNotification } from '../composables/useNotification';
import { useApi } from '../composables/useApi';
import type { WorkMetadata, SortOption, PaginationInfo, WorksResponse } from '../types';

const route = useRoute();
const $q = useQuasar();
const api = useApi();
const { showErrNotif } = useNotification();

defineOptions({ name: 'Works' });

const savedScrollTop = ref(0);
const lastLeftTo = ref('');
const listMode = ref(false);
const showLabel = ref(true);
const detailMode = ref(true);
const stopLoad = ref(false);
const works = ref<WorkMetadata[]>([]);
const pageTitle = ref('');
const seed = ref(7);
const pagination = ref<PaginationInfo>({ currentPage: 0, pageSize: 12, totalCount: 0 });

const options: SortOption[] = [
  { label: '按照发售日期新到老的顺序', value: 'release_desc' },
  { label: '按照我的评价排序', value: 'rating_desc' },
  { label: '按照发售日期老到新的顺序', value: 'release_asc' },
  { label: '按照售出数量多到少的顺序', value: 'dl_count_desc' },
  { label: '按照价格便宜到贵的顺序', value: 'price_asc' },
  { label: '按照价格贵到便宜的顺序', value: 'price_desc' },
  { label: '按照评价高到低的顺序', value: 'rate_average_2dp_desc' },
  { label: '按照评论多到少的顺序', value: 'review_count_desc' },
  { label: '按照RJ号大到小的顺序', value: 'id_desc' },
  { label: '按照RJ号小到大的顺序', value: 'id_asc' },
  { label: '按照全年龄新作优先的顺序', value: 'nsfw_asc' },
  { label: '随机排序', value: 'random_desc' },
];

const sortOption = ref<SortOption>(options[0]!);

const url = computed(() => {
  const query = route.query;
  if (query.circleId) return `/api/circles/${query.circleId}/works`;
  else if (query.tagIds) return `/api/tags-multi/works?tagIds=${query.tagIds}`;
  else if (query.tagId) return `/api/tags/${query.tagId}/works`;
  else if (query.vaId) return `/api/vas/${query.vaId}/works`;
  else if (query.keyword) return `/api/search/${query.keyword}`;
  else return '/api/works';
});

const refreshPageTitle = () => {
  const query = route.query;
  if (query.tagIds && typeof query.tagIds === 'string') {
    const tagIdArr = query.tagIds.split(',');
    const promises = tagIdArr.map((id) =>
      api
        .get<{ name: string }>(`/api/tags/${id}`)
        .then((res) => res.data.name)
        .catch(() => id),
    );
    Promise.all(promises).then((names) => {
      pageTitle.value = `Works tagged with ${names.join(' + ')}`;
    });
  } else if (query.circleId || query.tagId || query.vaId) {
    let apiUrl = '';
    let restrict = '';
    if (query.circleId) {
      restrict = 'circles';
      apiUrl = `/api/${restrict}/${query.circleId}`;
    } else if (query.tagId) {
      restrict = 'tags';
      apiUrl = `/api/${restrict}/${query.tagId}`;
    } else {
      restrict = 'vas';
      apiUrl = `/api/${restrict}/${query.vaId}`;
    }

    api
      .get<{ name: string }>(apiUrl)
      .then((response) => {
        const name = response.data.name;
        let title = '';
        if (restrict === 'tags') title = 'Works tagged with ';
        else if (restrict === 'vas') title = 'Works voiced by ';
        else title = 'Works by ';
        pageTitle.value = title + (name || '');
      })
      .catch((error: unknown) => {
        const err = error as { response?: { status?: number; data?: { error?: string }; statusText?: string }; message?: string };
        if (err.response && err.response.status !== 401) {
          showErrNotif(
            err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
          );
        } else if (!err.response) showErrNotif(err.message || String(error));
      });
  } else if (query.keyword) {
    pageTitle.value = `Search by ${query.keyword}`;
  } else {
    pageTitle.value = 'All works';
  }
};

const requestWorksQueue = () => {
  const [order, sort] = sortOption.value.value.split('_');
  const params = {
    order,
    sort,
    page: pagination.value.currentPage + 1 || 1,
    seed: seed.value,
  };
  return api
    .get<WorksResponse>(url.value, { params })
    .then((response) => {
      const data = response.data;
      works.value = params.page === 1 ? data.works.concat() : works.value.concat(data.works);
      pagination.value = data.pagination;
      if (works.value.length >= pagination.value.totalCount) stopLoad.value = true;
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

const onLoad = (_index: number, done: () => void) => {
  requestWorksQueue().then(() => done());
};

const reset = () => {
  stopLoad.value = true;
  refreshPageTitle();
  pagination.value = { currentPage: 0, pageSize: 12, totalCount: 0 };
  requestWorksQueue().then(() => {
    stopLoad.value = false;
  });
};

watch(url, () => reset());
watch(sortOption, (v) => {
  localStorage.sortOption = JSON.stringify(v);
  seed.value = Math.floor(Math.random() * 100);
  reset();
});
watch(showLabel, (v) => {
  localStorage.showLabel = String(v);
});
watch(listMode, (v) => {
  localStorage.listMode = String(v);
});
watch(detailMode, (v) => {
  localStorage.detailMode = String(v);
});

onMounted(() => {
  refreshPageTitle();
  seed.value = Math.floor(Math.random() * 100);
  if (localStorage.sortOption) {
    try {
      sortOption.value = JSON.parse(localStorage.sortOption);
    } catch {
      localStorage.removeItem('sortOption');
    }
  }
  if (localStorage.showLabel) showLabel.value = localStorage.showLabel === 'true';
  if (localStorage.listMode) listMode.value = localStorage.listMode === 'true';
  if (localStorage.detailMode) detailMode.value = localStorage.detailMode === 'true';
});

onBeforeRouteLeave((to) => {
  lastLeftTo.value = to.path;
});

onActivated(() => {
  if (lastLeftTo.value.startsWith('/work/')) {
    nextTick(() => window.scrollTo(0, savedScrollTop.value));
  } else {
    reset();
  }
  stopLoad.value = false;
});
onDeactivated(() => {
  savedScrollTop.value = window.scrollY;
  stopLoad.value = true;
});
</script>

<style lang="scss" scoped>
.list {
  @media (min-width: $breakpoint-sm-min) {
    padding: 0px 20px;
  }
}
.work-card {
  @media (min-width: $breakpoint-md-min) {
    width: 560px;
  }
}
</style>