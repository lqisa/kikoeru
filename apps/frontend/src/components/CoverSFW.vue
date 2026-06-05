<template>
  <router-link :to="`/work/${workid}`">
    <q-img
      :src="coverUrl"
      :ratio="4 / 3"
      :img-class="imgClass"
      style="max-width: 560px"
      transition="fade"
      @mouseover="toggleBlurFlag()"
      @mouseout="toggleBlurFlag()"
    >
      <div class="absolute-top-left transparent" style="padding: 0">
        <q-chip dense square color="brown" text-color="white" class="q-ma-sm">
          {{ `RJ${workid}` }}
        </q-chip>
      </div>

      <div v-if="release" class="absolute-bottom-right" style="padding: 5px">
        {{ release }}
      </div>
    </q-img>
  </router-link>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';

interface Props {
  workid: string | number;
  nsfw?: boolean;
  release: string;
}

const props = withDefaults(defineProps<Props>(), {
  nsfw: true,
});

const $q = useQuasar();
const blurFlag = ref(true);

const getToken = (): string => {
  return String($q.localStorage.getItem('jwt-token') || '');
};

const coverUrl = computed(() => {
  const token = getToken();
  return props.workid ? `/api/cover/${props.workid}?token=${token}` : '';
});

const imgClass = computed(() => {
  if ($q.platform.is.mobile) {
    return '';
  } else {
    if (!props.nsfw) {
      return '';
    } else {
      return blurFlag.value ? 'blur-image' : '';
    }
  }
});

const toggleBlurFlag = () => {
  blurFlag.value = !blurFlag.value;
};
</script>

<style lang="scss">
.blur-image {
  filter: blur(10px);
}
</style>
