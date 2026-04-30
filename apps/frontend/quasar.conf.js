/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES features that are supported by your Node version. https://node.green/
 */

const { configure } = require('quasar/wrappers');

module.exports = configure(function (/* ctx */) {
  return {
    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: [
      'axios',
      'plyr',
      'socket.io'
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-conf-js#Property%3A-css
    css: [
      'app.scss'
    ],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      'roboto-font',
      'material-icons'
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-conf-js#Property%3A-framework
    framework: {
      config: {},
      iconSet: 'material-icons', // Quasar icon set
      lang: 'en-US', // Quasar language pack
      all: 'auto',

      // Quasar plugins
      plugins: [
        'LocalStorage',
        'SessionStorage',
        'Notify'
      ]
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-conf-js#Property%3A-build
    build: {
      target: {
        browser: [ 'es2019', 'edge88', 'firefox78', 'chrome87' ],
        node: 'node20'
      },

      vueRouterMode: 'history', // available values: 'hash', 'history'
      sourcemap: true
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-conf-js#Property%3A-devServer
    devServer: {
      server: {
        type: 'http'
      },
      port: 8080,
      open: true, // opens browser window automatically
      proxy: {
        // proxy all requests starting with /api to http://localhost:8888
        '/api': 'http://localhost:8888',
        '/socket.io': {
          target: 'http://localhost:8888',
          ws: true
        }
      }
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-conf-js#Property%3A-animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      pwa: false,
      prodPort: 3000,
      middleWare: [
        'render' // keep this as last one
      ]
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'generateSW', // or 'injectManifest'
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,
      manifest: {
        name: 'Kikoeru',
        short_name: 'Kikoeru',
        description: 'A self-hosted web media player for listening to your DLsite voice works.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#027be3',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      id: 'org.cordova.quasar.kikoeru'
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      inspectPort: 5858,
      bundler: 'packager', // 'packager' or 'builder'
      packager: {},
      builder: {
        appId: 'kikoeru-quasar'
      },
      nodeIntegration: true
    }
  }
});
