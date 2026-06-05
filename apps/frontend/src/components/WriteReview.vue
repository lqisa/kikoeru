<template>
  <div>
    <q-dialog v-model="showReviewDialog" @hide="closeDialog">
      <q-card>
        <q-card-section class="q-pb-sm">
          <div class="text-body1">我的评论</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-rating
            v-model="rating"
            size="sm"
            color="blue"
            icon="star_border"
            icon-selected="star"
            icon-half="star_half"
            class="col-auto"
          />
          <q-btn-toggle
            v-model="progress"
            no-caps
            :class="
              $q.screen.lt.sm ? 'my-custom-toggle q-mx-none q-mt-sm' : 'my-custom-toggle q-mx-md'
            "
            rounded
            unelevated
            :padding="$q.screen.width < 400 ? 'sm' : ''"
            toggle-color="primary"
            color="white"
            text-color="primary"
            :options="[
              { label: '想听', value: 'marked' },
              { label: '在听', value: 'listening' },
              { label: '听过', value: 'listened' },
              { label: '重听', value: 'replay' },
              { label: '搁置', value: 'postponed' },
            ]"
          />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div style="min-width: 300px">
            <q-input v-model="reviewText" filled type="textarea" />
          </div>
        </q-card-section>

        <div class="row justify-between">
          <q-card-actions class="text-red">
            <q-btn flat label="删除标记" v-close-popup @click="deleteConfirm = true" />
          </q-card-actions>

          <q-card-actions align="right" class="text-primary">
            <q-btn flat label="确定" v-close-popup @click="submitReview()" />
            <q-btn flat label="取消" v-close-popup @click="closeDialog()" />
          </q-card-actions>
        </div>
      </q-card>
    </q-dialog>

    <q-dialog v-model="deleteConfirm" persistent transition-show="scale" transition-hide="scale">
      <q-card class="bg-teal text-white" style="width: 300px">
        <q-card-section>
          <div class="text-h6">确定要删除标记吗</div>
        </q-card-section>

        <q-card-actions align="right" class="bg-white text-teal">
          <q-btn flat label="确定" v-close-popup @click="deleteReview()" />
          <q-btn flat label="取消" v-close-popup @click="closeDialog()" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { inject } from 'vue';
import { useNotification } from '../composables/useNotification';

interface Props {
  workid: number;
  metadata?: Record<string, unknown>;
}

const props = withDefaults(defineProps<Props>(), { metadata: () => ({}) });
const emit = defineEmits<{ (e: 'closed', modified: boolean): void }>();

const $axios = inject<any>('axios')!;
const { showSuccNotif, showErrNotif } = useNotification();

const showReviewDialog = ref(true);
const deleteConfirm = ref(false);
const rating = ref(0);
const reviewText = ref('');
const modified = ref(false);
const progress = ref('');

if (props.metadata.userRating) rating.value = props.metadata.userRating as number;
progress.value = (props.metadata.progress as string) || '';
reviewText.value = (props.metadata.review_text as string) || '';

const closeDialog = () => {
  if (!deleteConfirm.value) {
    emit('closed', modified.value);
  }
};

const reviewPayload = () => ({
  user_name: '',
  work_id: props.workid,
  rating: rating.value,
  review_text: reviewText.value,
  progress: progress.value,
});

const submitReview = () => {
  void $axios
    .put('/api/review', reviewPayload(), { params: { starOnly: false } })
    .then((response: { data: { message: string } }) => {
      modified.value = true;
      showSuccNotif(response.data.message);
    })
    .then(() => closeDialog())
    .catch((error: any) => {
      if (error.response) {
        showErrNotif(
          error.response.data?.error || `${error.response.status} ${error.response.statusText}`,
        );
      } else {
        showErrNotif(error.message || String(error));
      }
    });
};

const deleteReview = () => {
  void $axios
    .delete('/api/review', { params: { work_id: props.workid } })
    .then((response: { data: { message: string } }) => {
      modified.value = true;
      showSuccNotif(response.data.message);
    })
    .then(() => closeDialog())
    .catch((error: any) => {
      if (error.response) {
        showErrNotif(
          error.response.data?.error || `${error.response.status} ${error.response.statusText}`,
        );
      } else {
        showErrNotif(error.message || String(error));
      }
    });
};
</script>

<style lang="sass" scoped>
.my-custom-toggle
  border: 1px solid #027be3
</style>
