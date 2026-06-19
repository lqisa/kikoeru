const path = require('path')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const childProcess = require('child_process')
const { config } = require('./config')

const initSocket = (server, app) => {
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
      user,
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
        scanner = childProcess.fork(path.join(__dirname, './filesystem/scanner.js'), { silent: false })
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
        scanner = childProcess.fork(path.join(__dirname, './filesystem/updater.js'), ['--refreshAll'], { silent: false })
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

    socket.on('PERFORM_SUBTITLE_SCAN', () => {
      const subtitleScanner = childProcess.fork(path.join(__dirname, './filesystem/subtitleScanner.js'), { silent: false })
      subtitleScanner.on('exit', (code) => {
        if (code) {
          io.emit('SUBTITLE_SCAN_ERROR', { message: '字幕扫描进程异常退出.' })
        }
      })

      subtitleScanner.on('message', (m) => {
        if (m.event) {
          io.emit(m.event, m.payload)
        }
      })
    })

    socket.on('error', (err) => {
      console.error(err)
    })
  })

  if (app) {
    app.set('io', io)
  }

  return io
}

module.exports = initSocket