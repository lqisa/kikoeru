import { boot } from 'quasar/wrappers'
import VuePlyr from 'vue-plyr'
import 'plyr/dist/plyr.css'

export default boot(({ app }) => {
  app.use(VuePlyr, {
    plyr: {
      controls: ['progress']
    }
  })
})