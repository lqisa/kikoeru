<template>
  <div>
    <router-link :to="`/work/${metadata.id}`">
      <CoverSFW :workid="metadata.id" :nsfw="false" :release="metadata.release" :show-gear="isAdmin" @open-cover-picker="showCoverPicker = true" />
    </router-link>

    <div class="q-pa-sm">
      <div class="q-px-sm q-py-none">
        <!-- 标题 -->
        <div class="text-h6 text-weight-regular">
          <router-link :to="`/work/${metadata.id}`" class="text-black">
            {{ metadata.title }}
          </router-link>
        </div>

        <!-- 社团 -->
        <div class="text-subtitle1 text-weight-regular">
          <router-link :to="`/works?circleId=${metadata.circle.id}`" class="text-grey">
            {{ metadata.circle.name }}
          </router-link>
        </div>

        <!-- 评价&评论 -->
        <div class="row items-center q-gutter-xs">
          <!-- 评价 -->
          <div class="col-auto">
            <q-rating
              v-model="rating"
              @input="setRating"
              name="rating"
              size="sm"
              :color="userMarked ? 'blue' : 'amber'"
              icon="star_border"
              icon-selected="star"
              icon-half="star_half"
            />

            <!-- 评价分布明细 -->
            <q-tooltip v-if="metadata.rate_count_detail" content-class="text-subtitle1">
              <div>平均: {{ metadata.rate_average_2dp }}</div>
              <div v-for="(rate, index) in sortedRatings" :key="index" class="row items-center">
                <div class="col">{{ rate.review_point }}星</div>

                <!-- 评价占比 -->
                <q-linear-progress
                  :value="rate.ratio / 100"
                  color="amber"
                  track-color="white"
                  style="height: 15px; width: 100px"
                  class="col-auto"
                />

                <div class="col q-mx-sm">({{ rate.count }})</div>
              </div>
            </q-tooltip>
          </div>

          <div class="col-auto">
            <span class="text-weight-medium text-body1 text-red">{{
              metadata.rate_average_2dp
            }}</span>
            <span class="text-grey"> ({{ metadata.rate_count }})</span>
          </div>

          <!-- 评论数量 -->
          <div class="col-auto q-px-sm">
            <q-icon name="chat" size="xs" />
            <span class="text-grey"> ({{ metadata.review_count }})</span>
          </div>

          <!-- DLsite链接 -->
          <div class="col-auto">
            <q-icon name="launch" size="xs" /><a
              class="text-blue"
              :href="`https://www.dlsite.com/home/work/=/product_id/RJ${String(metadata.id).padStart(6, '0')}.html`"
              rel="noreferrer noopener"
              target="_blank"
              >DLsite</a
            >
          </div>
        </div>
      </div>

      <!-- 价格&售出数 -->
      <div class="q-pt-sm q-pb-none">
        <span class="q-mx-sm text-weight-medium text-h6 text-red">{{ metadata.price }} 日元</span>
        售出数 {{ metadata.dl_count }}
      </div>

      <!-- 标签 -->
      <div class="q-px-none q-py-sm" v-if="showTags">
        <router-link
          v-for="(tag, index) in metadata.tags"
          :to="`/works?tagId=${tag.id}`"
          :key="index"
        >
          <q-chip size="md" class="shadow-4">
            {{ tag.name }}
          </q-chip>
        </router-link>
      </div>

      <!-- 声优 -->
      <div class="q-px-none q-pt-sm q-py-sm">
        <router-link v-for="(va, index) in metadata.vas" :to="`/works?vaId=${va.id}`" :key="index">
          <q-chip square size="md" class="shadow-4" color="teal" text-color="white">
            {{ va.name }}
          </q-chip>
        </router-link>
      </div>

      <q-btn-dropdown dense class="q-mt-sm shadow-4 q-mx-xs q-pl-sm" color="cyan" label="标记进度">
        <q-list>
          <q-item clickable @click="setProgress('marked')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'marked'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>想听</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable @click="setProgress('listening')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'listening'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>在听</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable @click="setProgress('listened')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'listened'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>听过</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable @click="setProgress('replay')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'replay'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>重听</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable @click="setProgress('postponed')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'postponed'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>搁置</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>

      <q-btn
        dense
        color="cyan"
        class="q-mt-sm shadow-4 q-mx-xs q-px-sm"
        label="写评论"
        @click="showReviewDialog = true"
      />

      <WriteReview
        v-if="showReviewDialog"
        @closed="processReview"
        :workid="metadata.id"
        :metadata="metadata"
      ></WriteReview>
    </div>

    <CoverPicker
      v-if="showCoverPicker"
      :root-path="workDir || ''"
      root-name="作品目录"
      @ok="onCoverSelected"
      @hide="showCoverPicker = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { WorkMetadata, RatingDetail, ReviewSubmitResponse, SetCoverResponse } from '../types';
import CoverSFW from 'components/CoverSFW.vue';
import CoverPicker from './CoverPicker.vue';
import WriteReview from './WriteReview.vue';
import { useNotification } from '../composables/useNotification';
import { useApi } from '../composables/useApi';
import { useUserStore } from '../stores/user';

const props = defineProps<{ metadata: WorkMetadata; workDir?: string }>();
const emit = defineEmits<{ (e: 'reset'): void }>();

const api = useApi();
const { showSuccNotif, showErrNotif } = useNotification();
const userStore = useUserStore();

const rating = ref(0);
const userMarked = ref(false);
const progress = ref('');
const showReviewDialog = ref(false);
const showTags = ref(true);
const showCoverPicker = ref(false);

const isAdmin = computed(() => {
  return userStore.group === 'administrator';
});

const sortedRatings = computed(() => {
  if (!props.metadata.rate_count_detail) return [];
  return [...props.metadata.rate_count_detail].sort((a: RatingDetail, b: RatingDetail) =>
    a.review_point > b.review_point ? -1 : 1,
  );
});

watch(
  () => props.metadata,
  (m) => {
    if (m.userRating) {
      userMarked.value = true;
      rating.value = m.userRating;
    } else {
      userMarked.value = false;
      rating.value = m.rate_average_2dp || 0;
    }
    progress.value = m.progress || '';
    if (m.tags && m.tags[0]?.name === null) showTags.value = false;
  },
  { immediate: true },
);

const submitApiCall = (payload: Record<string, unknown>, params?: Record<string, unknown>) => {
  return api
    .put<ReviewSubmitResponse>('/api/review', payload, { params: params || {} })
    .then((r) => {
      showSuccNotif(r.data.message);
      emit('reset');
    })
    .catch((error: unknown) => {
      const err = error as { response?: { data?: { error?: string }; status?: number; statusText?: string }; message?: string };
      if (err.response)
        showErrNotif(
          err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
        );
      else showErrNotif(err.message || String(error));
    });
};

const setProgress = (newProgress: string) => {
  progress.value = newProgress;
  submitApiCall(
    { user_name: userStore.name, work_id: props.metadata.id, progress: newProgress },
    { starOnly: false, progressOnly: true },
  );
};

const setRating = (newRating: number) => {
  submitApiCall({ user_name: userStore.name, work_id: props.metadata.id, rating: newRating });
};

const processReview = () => {
  showReviewDialog.value = false;
};

const onCoverSelected = (imagePath: string) => {
  showCoverPicker.value = false;
  api
    .post<SetCoverResponse>('/api/cover/' + props.metadata.id, {
      imagePath,
    })
    .then((response) => {
      showSuccNotif(response.data.message);
      emit('reset');
    })
    .catch((error: unknown) => {
      const err = error as {
        response?: { data?: { error?: string }; status?: number; statusText?: string };
        message?: string;
      };
      showErrNotif(
        err.response?.data?.error || err.message || '设置封面失败',
      );
    });
};
</script>