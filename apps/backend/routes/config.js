const _ = require('lodash')
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const { config, setConfig, sharedConfigHandle } = require('../config')

const filterConfig = (_config, option = 'read') => {
  const currentConfig = config
  const configClone = _.cloneDeep(_config)
  delete configClone.md5secret
  delete configClone.jwtsecret
  if (option === 'write') {
    delete configClone.production
    if (process.env.NODE_ENV === 'production' || currentConfig.production) {
      delete configClone.auth
    }
  }
  return configClone
}

// 修改配置文件
router.put('/admin', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    try {
      // Note: setConfig uses Object.assign to merge new configs
      setConfig(filterConfig(req.body.config, 'write'))
      res.send({ message: '保存成功.' })
    } catch (err) {
      next(err)
    }
  } else {
    res.status(403).send({ error: '只有 admin 账号能修改配置文件.' })
  }
})

// 获取配置文件
router.get('/admin', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    try {
      res.send({ config: filterConfig(config, 'read') })
    } catch (err) {
      next(err)
    }
  } else {
    res.status(403).send({ error: '只有 admin 账号能读取管理配置文件.' })
  }
})

// 浏览服务器目录
router.get('/browse', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    const requestedPath = req.query.path

    if (!requestedPath) {
      if (process.platform === 'win32') {
        const drives = []
        for (let code = 65; code <= 90; code++) {
          const drive = String.fromCharCode(code) + ':\\'
          try {
            fs.accessSync(drive, fs.constants.R_OK)
            drives.push({ name: drive, path: drive })
          } catch (_) {
            // 驱动器不存在，跳过
          }
        }
        res.send({ currentPath: '', dirs: drives })
      } else {
        res.send({ currentPath: '/', dirs: [{ name: '/', path: '/' }] })
      }
      return
    }

    const resolvedPath = path.resolve(requestedPath)

    fs.readdir(resolvedPath, { withFileTypes: true }, (err, entries) => {
      if (err) {
        res.send({ currentPath: resolvedPath, dirs: [] })
        return
      }
      const dirs = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          name: entry.name,
          path: path.join(resolvedPath, entry.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      res.send({ currentPath: resolvedPath, dirs })
    })
  } else {
    res.status(403).send({ error: '只有 admin 账号能浏览目录.' })
  }
})

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

router.get('/browse-files', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    const requestedPath = req.query.path

    if (!requestedPath) {
      res.status(400).send({ error: '请提供 path 参数' })
      return
    }

    const resolvedPath = path.resolve(requestedPath)

    fs.readdir(resolvedPath, { withFileTypes: true }, (err, entries) => {
      if (err) {
        res.send({ currentPath: resolvedPath, dirs: [], files: [] })
        return
      }
      const dirs = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          name: entry.name,
          path: path.join(resolvedPath, entry.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      const files = entries
        .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
        .map((entry) => ({
          name: entry.name,
          path: path.join(resolvedPath, entry.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      res.send({ currentPath: resolvedPath, dirs, files })
    })
  } else {
    res.status(403).send({ error: '只有 admin 账号能浏览目录.' })
  }
})

router.get('/preview-image', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    const requestedPath = req.query.path
    if (!requestedPath) {
      return res.status(400).send({ error: '请提供 path 参数' })
    }
    const resolvedPath = path.resolve(requestedPath)
    res.sendFile(resolvedPath, (err) => {
      if (err) {
        res.status(404).send({ error: '图片不存在' })
      }
    })
  } else {
    res.status(403).send({ error: '只有 admin 账号能预览图片.' })
  }
})

router.get('/shared', (req, res, next) => {
  try {
    res.send({ sharedConfig: sharedConfigHandle.export() })
  } catch (err) {
    next(err)
  }
})

module.exports = router