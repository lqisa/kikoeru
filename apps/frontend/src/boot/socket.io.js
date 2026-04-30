import { boot } from 'quasar/wrappers'
import VueSocketIO from 'vue-socket.io'

export default boot(({ app }) => {
  const socketIO = new VueSocketIO({
    debug: false,
    connection: '',
    options: {
      autoConnect: false,
      query: {
        auth_token: ''
      }
    }
  })

  // Vue 3 compatible shim for Vue 2 vue-socket.io plugin
  socketIO.install({
    prototype: app.config.globalProperties,
    mixin: app.mixin.bind(app)
  })
})