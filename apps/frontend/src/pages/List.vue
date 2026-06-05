<template>
  <div>
    <div class="text-h5 text-weight-regular q-ma-md">
      All {{ restrict }}s
      <span v-if="restrict === 'tags' && selectedItems.length > 0" class="text-subtitle1">
        — {{ selectedItems.length }} selected
      </span>
    </div>

    <div class="row justify-center q-pb-xl q-pt-none">
      <div class="col-11">
        <q-input
          dense
          rounded
          outlined
          v-model="keyword"
          :placeholder="`Search for a ${restrict}...`"
          class="q-mb-md"
        >
          <template #append>
            <q-icon v-if="keyword === ''" name="search" />
            <q-icon v-else name="clear" class="cursor-pointer" @click="keyword = ''" />
          </template>
        </q-input>

        <div v-if="restrict === 'tags' && selectedItems.length > 0" class="q-mb-md">
          <q-chip
            v-for="item in selectedItems"
            :key="item.id"
            removable
            color="primary"
            text-color="white"
            @remove="toggleItem(item)"
          >
            {{ item.name }}
          </q-chip>
          <q-btn
            rounded
            color="positive"
            icon="search"
            label="多标签搜索"
            :to="`/works?tagIds=${selectedItems.map((t) => t.id).join(',')}`"
            class="q-mr-sm"
          />
          <q-btn
            rounded
            flat
            color="negative"
            icon="clear_all"
            label="清空"
            @click="clearSelected"
          />
        </div>

        <div class="row justify-center q-gutter-sm">
          <div class="col-auto" v-for="item in keyword ? filteredItems : items" :key="item.id">
            <q-btn
              no-caps
              rounded
              :color="isSelected(item) ? 'positive' : 'primary'"
              :outline="restrict === 'tags' && !isSelected(item)"
              :label="`${item.name} (${item.count})`"
              @click="restrict === 'tags' ? toggleItem(item) : goToWorks(item)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import { useNotification } from '../composables/useNotification';

interface ListItem {
  id: number;
  name: string;
  count: number;
}

const props = defineProps<{ restrict: string }>();
const router = useRouter();
const $axios = inject<{ get: (url: string) => Promise<{ data: ListItem[] }> }>('axios')!;
const { showErrNotif } = useNotification();

const items = ref<ListItem[]>([]);
const keyword = ref('');
const selectedItems = ref<ListItem[]>([]);

const url = computed(() => `/api/${props.restrict}/`);
const queryField = computed(() => {
  switch (props.restrict) {
    case 'circles':
      return 'circleId';
    case 'tags':
      return 'tagId';
    case 'vas':
      return 'vaId';
    default:
      return 'circleId';
  }
});

const filteredItems = computed(() =>
  items.value.filter((item) => item.name.toLowerCase().includes(keyword.value.toLowerCase())),
);

const isSelected = (item: ListItem) => selectedItems.value.some((t) => t.id === item.id);

const toggleItem = (item: ListItem) => {
  const index = selectedItems.value.findIndex((t) => t.id === item.id);
  if (index !== -1) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(item);
  }
  saveSelectedItems();
};

const restoreSelectedItems = () => {
  if (props.restrict !== 'tags') return;
  try {
    const saved = sessionStorage.getItem('kikoeru-selected-tags');
    if (saved) selectedItems.value = JSON.parse(saved);
  } catch {
    sessionStorage.removeItem('kikoeru-selected-tags');
  }
};

const saveSelectedItems = () => {
  if (props.restrict === 'tags') {
    sessionStorage.setItem('kikoeru-selected-tags', JSON.stringify(selectedItems.value));
  }
};

const goToWorks = (item: ListItem) => router.push(`/works?${queryField.value}=${item.id}`);
const clearSelected = () => {
  selectedItems.value = [];
  sessionStorage.removeItem('kikoeru-selected-tags');
};

const requestList = () => {
  $axios
    .get(url.value)
    .then((response) => {
      items.value = (response.data).concat();
    })
    .catch((error) => {
      if (error.response && error.response.status !== 401) {
        showErrNotif(
          error.response.data.error || `${error.response.status} ${error.response.statusText}`,
        );
      } else if (!error.response) showErrNotif(error.message || error);
    });
};

watch(url, () => requestList());

onMounted(() => {
  restoreSelectedItems();
  requestList();
});
</script>
