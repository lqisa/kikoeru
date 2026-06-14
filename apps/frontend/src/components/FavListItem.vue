<template>
  <q-item clickable class="row bg-white">
    <q-item-section class="col-auto" top>
      <router-link :to="`/work/${metadata.id}`">
        <q-img transition="fade" :src="coverUrl" style="height: 120px; width: 160px" />
      </router-link>
    </q-item-section>

    <q-item-section
      class="q-gutter-y-xs column items-start"
      top
      @click.self="showReviewDialog = true"
    >
      <q-item-label lines="2" class="text-body2">
        <router-link :to="`/work/${metadata.id}`" class="col-auto text-black">
          {{ metadata.title }}
        </router-link>
      </q-item-label>

      <div class="row q-gutter-x-sm col-auto">
        <router-link :to="`/works?circleId=${metadata.circle.id}`" class="col-auto text-grey">
          {{ metadata.circle.name }}
        </router-link>

        <span class="col-auto">/</span>
        <span class="col-auto text-grey"> {{ metadata.release }}</span>
        <span class="col-auto">/</span>

        <router-link
          v-for="(va, index) in metadata.vas"
          :key="index"
          :to="`/works?vaId=${va.id}`"
          class="col-auto text-primary"
        >
          {{ va.name }}
        </router-link>
      </div>

      <div class="row items-center q-gutter-x-xs">
        <q-rating
          v-if="!hideRating"
          v-model="rating"
          @input="setRating"
          size="sm"
          color="blue"
          icon="star_border"
          icon-selected="star"
          icon-half="star_half"
          class="col-auto"
        />
        <span class="col-auto text-grey">{{ metadata.updated_at }}</span>
      </div>

      <q-item-label class="q-pt-sm" v-if="mode === 'review'">
        <q-card
          class="my-card col-auto"
          @click="showReviewDialog = true"
          v-show="metadata.review_text"
        >
          <q-card-section class="q-pa-sm">
            <pre class="q-ma-none">{{ metadata.review_text }}</pre>
          </q-card-section>
        </q-card>
      </q-item-label>

      <q-item-label class="q-pt-xs" v-if="mode === 'progress'">
        <q-btn-toggle
          v-if="mode === 'progress'"
          v-model="progress"
          @input="setProgress"
          dense
          no-caps
          rounded
          toggle-color="primary"
          color="white"
          text-color="black"
          class="q-pa-sm"
          :options="[
            { label: '想听', value: 'marked' },
            { label: '在听', value: 'listening' },
            { label: '听过', value: 'listened' },
            { label: '重听', value: 'replay' },
            { label: '搁置', value: 'postponed' },
          ]"
        />
      </q-item-label>
    </q-item-section>

    <WriteReview
      v-if="showReviewDialog"
      @closed="processReview"
      :workid="workid"
      :metadata="metadata"
    ></WriteReview>
  </q-item>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useNotification } from '../composables/useNotification';
import { useApi } from '../composables/useApi';
import { useUserStore } from '../stores/user';
import type { WorkMetadata, ReviewSubmitResponse } from '../types';

interface Props {
  workid: number;
  metadata: WorkMetadata;
  mode?: string;
}

const props = withDefaults(defineProps<Props>(), { mode: 'review' });
const emit = defineEmits<{ (e: 'reset'): void }>();

const $q = useQuasar();
const api = useApi();
const { showSuccNotif, showErrNotif } = useNotification();
const userStore = useUserStore();

const rating = ref(0);
const showReviewDialog = ref(false);
const hideRating = ref(false);
const progress = ref('');

const getToken = (): string => String($q.localStorage.getItem('jwt-token') || '');

const coverUrl = computed(() => {
  const token = getToken();
  return props.workid ? `/api/cover/${props.workid}?type=240x240&token=${token}` : '';
});

const setMetadata = () => {
  if (props.metadata.userRating) {
    rating.value = props.metadata.userRating;
    hideRating.value = false;
  } else {
    hideRating.value = true;
  }
  if (!rating.value) hideRating.value = true;
  else hideRating.value = false;
  progress.value = props.metadata.progress || '';
};

watch(
  () => props.metadata,
  () => setMetadata(),
);
onMounted(() => setMetadata());

const processReview = (modified: boolean) => {
  if (modified) emit('reset');
  showReviewDialog.value = false;
};

const setRating = (newRating: number) => {
  if (newRating) {
    submitApiCall(
      {
        user_name: userStore.name,
        work_id: props.metadata.id,
        rating: newRating,
        params: { starOnly: true },
      },
      { starOnly: true },
    );
  }
};

const setProgress = (newProgress: string) => {
  progress.value = newProgress;
  submitApiCall(
    { user_name: userStore.name, work_id: props.metadata.id, progress: newProgress },
    { starOnly: false, progressOnly: true },
  );
};

const submitApiCall = (payload: Record<string, unknown>, params?: Record<string, unknown>) => {
  void api
    .put<ReviewSubmitResponse>('/api/review', payload, { params: params || {} })
    .then((response) => {
      showSuccNotif(response.data.message);
    })
    .then(() => emit('reset'))
    .catch((error: unknown) => {
      const err = error as { response?: { status?: number; data?: { error?: string }; statusText?: string }; message?: string };
      if (err.response)
        showErrNotif(
          err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
        );
      else showErrNotif(err.message || String(error));
    });
};
</script>