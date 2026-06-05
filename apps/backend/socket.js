const path = require('path')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const child_process = require('child_process')
const { config } = require('./config')

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  if (config.auth) {
    io.use((socket, next) => {
      const token = socket.handshake.auth.token

      if (!token) {
        return next(new Error('Authentication error'))
      }

      try {
        const decoded = jwt.verify(token, config.jwtsecret)
        socket.data.user = decoded
        next()
      } catch (err) {
        next(new Error('Authentication error'))
      }
    })
  }

  let scanner = null

  io.on('connection', function (socket) {
    const user = socket.data.user || { name: 'guest', group: 'guest' }

    socket.emit('success', {
      message: '成功登录管理后台.',
      user: user,
      auth: config.auth
    })

    socket.on('ON_SCANNER_PAGE', () => {
      if (scanner) {
        scanner.send({
          emit: 'SCAN_INIT_STATE'
        })
      }
    })

    socket.on('PERFORM_SCAN', () => {
      if (!scanner) {
        scanner = child_process.fork(path.join(__dirname, './filesystem/scanner.js'), { silent: false })
        scanner.on('exit', (code) => {
          scanner = null
          if (code) {
            io.emit('SCAN_ERROR')
          }
        })

        scanner.on('message', (m) => {
          if (m.event) {
            io.emit(m.event, m.payload)
          }
        })
      }
    })

    socket.on('PERFORM_UPDATE', () => {
      if (!scanner) {
        scanner = child_process.fork(path.join(__dirname, './filesystem/updater.js'), ['--refreshAll'], { silent: false })
        scanner.on('exit', (code) => {
          scanner = null
          if (code) {
            io.emit('SCAN_ERROR')
          }
        })

        scanner.on('message', (m) => {
          if (m.event) {
            io.emit(m.event, m.payload)
          }
        })
      }
    })

    socket.on('KILL_SCAN_PROCESS', () => {
      scanner.send({
        exit: 1
      })
    })

    socket.on('error', (err) => {
      console.error(err)
    })
  })
}

module.exports = initSocket
