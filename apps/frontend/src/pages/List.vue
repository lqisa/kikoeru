<template>
  <div>
    <div class="text-h5 text-weight-regular q-ma-md">
      All {{restrict}}s
      <span v-if="restrict === 'tags' && selectedItems.length > 0" class="text-subtitle1">
        — {{selectedItems.length}} selected
      </span>
    </div>

    <div class="row justify-center q-pb-xl q-pt-none">
      <div class="col-11">
        <q-input dense rounded outlined v-model="keyword" :placeholder="`Search for a ${restrict}...`" class="q-mb-md">
          <template v-slot:append>
            <q-icon v-if="keyword === ''" name="search" />
            <q-icon v-else name="clear" class="cursor-pointer" @click="keyword = ''" />
          </template>
        </q-input>

        <!-- 多标签模式下显示已选标签 chips 和搜索按钮 -->
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
            :to="`/works?tagIds=${selectedItems.map(t => t.id).join(',')}`"
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
          <div class="col-auto" v-for="item in (keyword ? filteredItems : items)" :key="item.id">
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

<script>
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'List',

  mixins: [NotifyMixin],

  props: {
    restrict: {
      type: String
    }
  },

    data () {
    return {
      items: [],
      keyword: '',
      selectedItems: []
    }
  },

  created () {
    // 从 sessionStorage 恢复已选标签
    this.restoreSelectedItems()
    this.requestList()
  },

  computed: {
    url () {
      return `/api/${this.restrict}/`
    },

    queryField () {
      switch (this.restrict) {
        case 'circles':
          return 'circleId'
        case 'tags':
          return 'tagId'
        case 'vas':
          return 'vaId'
        default:
          return 'circleId'
      }
    },

    filteredItems () {
      return this.items.filter(item => item.name.toLowerCase().indexOf(this.keyword.toLowerCase()) !== -1)
    }
  },

  watch: {
    url () {
      this.requestList()
    }
  },

    methods: {
    isSelected (item) {
      return this.selectedItems.some(t => t.id === item.id)
    },

    toggleItem (item) {
      const index = this.selectedItems.findIndex(t => t.id === item.id)
      if (index !== -1) {
        this.selectedItems.splice(index, 1)
      } else {
        this.selectedItems.push(item)
      }
      this.saveSelectedItems()
    },

    restoreSelectedItems () {
      if (this.restrict !== 'tags') return
      try {
        const saved = sessionStorage.getItem('kikoeru-selected-tags')
        if (saved) {
          this.selectedItems = JSON.parse(saved)
        }
      } catch (e) {
        sessionStorage.removeItem('kikoeru-selected-tags')
      }
    },

    saveSelectedItems () {
      if (this.restrict === 'tags') {
        sessionStorage.setItem('kikoeru-selected-tags', JSON.stringify(this.selectedItems))
      }
    },

        goToWorks (item) {
      this.$router.push(`/works?${this.queryField}=${item.id}`)
    },

    clearSelected () {
      this.selectedItems = []
      sessionStorage.removeItem('kikoeru-selected-tags')
    },

    requestList () { 
      this.$axios.get(this.url)
        .then((response) => {
          this.items = response.data.concat()
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },
  }
}
</script>
