const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')
const jschardet = require('jschardet')
const iconv = require('iconv-lite')
const { knex } = require('../database/db')
const { config } = require('../config')
const { matchSubtitles } = require('../filesystem/subtitleMatcher')

const SUBTITLE_EXTENSIONS = new Set(['.lrc', '.vtt'])

const findWorkDirInFolder = (folderPath, workId) => {
  const candidates = [`RJ${workId}`, `VJ${workId}`, `rj${workId}`, `vj${workId}`]
  for (const c of candidates) {
    const p = path.join(folderPath, c)
    if (fs.existsSync(p)) return p
  }
  return null
}

const walkSubtitleFiles = (dir, currentDepth, maxDepth) => {
  const results = []
  if (currentDepth > maxDepth) return results
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (_) {
    return results
  }
  for (const entry of entries) {
    if (entry.isFile() && SUBTITLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push({ filename: entry.name, relativePath: '' })
    } else if (entry.isDirectory() && currentDepth < maxDepth) {
      const subResults = walkSubtitleFiles(path.join(dir, entry.name), currentDepth + 1, maxDepth)
      for (const r of subResults) {
        r.relativePath = r.relativePath ? `${entry.name}/${r.relativePath}` : entry.name
      }
      results.push(...subResults)
    }
  }
  return results
}

const readSubtitleFile = (filePath) => {
  const buffer = fs.readFileSync(filePath)
  const detected = jschardet.detect(buffer)
  const encoding = detected.encoding || 'utf-8'
  if (encoding.toLowerCase() === 'utf-8' || encoding.toLowerCase() === 'ascii') {
    return buffer.toString('utf-8')
  }
  return iconv.decode(buffer, encoding)
}

const findSubtitlesInWorkDir = async (workId, audioFilename) => {
  const work = await knex('t_work').select('root_folder', 'dir').where('id', '=', workId).first()
  if (!work) return []

  const rootFolder = config.rootFolders.find(rf => rf.name === work.root_folder)
  if (!rootFolder) return []

  const workDir = path.join(rootFolder.path, work.dir)
  if (!fs.existsSync(workDir)) return []

  const subtitleFiles = walkSubtitleFiles(workDir, 1, 3)

  if (subtitleFiles.length === 0) return []

  const subtitleFilenames = subtitleFiles.map(s => s.filename)
  const matches = matchSubtitles(audioFilename, subtitleFilenames)
  return matches.map(m => {
    const sf = subtitleFiles.find(s => s.filename === m.subtitleFilename)
    return {
      ...m,
      source: 'local',
      subtitle_folder_id: null,
      subtitle_relative_path: sf ? sf.relativePath : ''
    }
  })
}

const findSubtitlesInLibrary = async (workId, audioFilename) => {
  const folders = await knex('t_subtitle_folder').select('*')
  const results = []

  for (const folder of folders) {
    const workDir = findWorkDirInFolder(folder.path, workId)
    if (!workDir) continue

    const subtitleFiles = walkSubtitleFiles(workDir, 1, folder.scan_depth || 3)

    if (subtitleFiles.length === 0) continue

    const subtitleFilenames = subtitleFiles.map(s => s.filename)
    const matches = matchSubtitles(audioFilename, subtitleFilenames)
    for (const m of matches) {
      const sf = subtitleFiles.find(s => s.filename === m.subtitleFilename)
      results.push({
        ...m,
        source: 'library',
        subtitle_folder_id: folder.id,
        subtitle_relative_path: sf ? sf.relativePath : ''
      })
    }
  }

  return results
}

const performLazyMatch = async (workId, audioFilename) => {
  const existing = await knex('t_subtitle_mapping')
    .where('work_id', workId)
    .where('audio_filename', audioFilename)
    .select('*')

  if (existing.length > 0) {
    return {
      mappings: existing.map(e => ({
        id: e.id,
        subtitleFilename: e.subtitle_filename,
        subtitleType: e.subtitle_type,
        confidence: e.confidence,
        source: e.subtitle_folder_id === null ? 'local' : 'library',
        subtitleRelativePath: e.subtitle_relative_path || ''
      })),
      subtitleMissing: false
    }
  }

  const localResults = await findSubtitlesInWorkDir(workId, audioFilename)
  const libraryResults = await findSubtitlesInLibrary(workId, audioFilename)
  const allResults = [...localResults, ...libraryResults]

  if (allResults.length === 0) {
    const folders = await knex('t_subtitle_folder').select('*')
    return {
      mappings: [],
      subtitleMissing: true
    }
  }

  const rows = allResults.map(r => ({
    work_id: workId,
    audio_filename: audioFilename,
    subtitle_filename: r.subtitleFilename,
    subtitle_relative_path: r.subtitle_relative_path || '',
    subtitle_folder_id: r.subtitle_folder_id,
    subtitle_type: r.subtitleType,
    confidence: r.confidence
  }))

  await knex('t_subtitle_mapping').insert(rows)

  const inserted = await knex('t_subtitle_mapping')
    .where('work_id', workId)
    .where('audio_filename', audioFilename)
    .select('*')

  return {
    mappings: inserted.map(e => ({
      id: e.id,
      subtitleFilename: e.subtitle_filename,
      subtitleType: e.subtitle_type,
      confidence: e.confidence,
      source: e.subtitle_folder_id === null ? 'local' : 'library',
      subtitleRelativePath: e.subtitle_relative_path || ''
    })),
    subtitleMissing: false
  }
}

router.get('/folders', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    knex('t_subtitle_folder').select('*')
      .then(folders => res.send({ folders }))
      .catch(err => next(err))
  } else {
    res.status(403).send({ error: '只有 admin 账号能管理字幕目录.' })
  }
})

router.post('/folders', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    const { name, path: folderPath, scan_depth } = req.body
    if (!folderPath) {
      return res.status(400).send({ error: '路径不能为空.' })
    }
    const depth = (typeof scan_depth === 'number' && scan_depth >= 1 && scan_depth <= 10) ? scan_depth : 3
    knex('t_subtitle_folder').insert({ name: name || null, path: folderPath, scan_depth: depth })
      .then(() => res.send({ message: '添加成功.' }))
      .catch(err => {
        if (err.message && err.message.includes('UNIQUE')) {
          res.status(400).send({ error: '该路径已存在.' })
        } else {
          next(err)
        }
      })
  } else {
    res.status(403).send({ error: '只有 admin 账号能管理字幕目录.' })
  }
})

router.patch('/folders/:id', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    const { scan_depth } = req.body
    if (typeof scan_depth !== 'number' || scan_depth < 1 || scan_depth > 10) {
      return res.status(400).send({ error: 'scan_depth 必须为 1-10 的整数.' })
    }
    knex('t_subtitle_folder').where('id', '=', req.params.id).update({ scan_depth })
      .then(() => res.send({ message: '更新成功.' }))
      .catch(err => next(err))
  } else {
    res.status(403).send({ error: '只有 admin 账号能管理字幕目录.' })
  }
})

router.delete('/folders/:id', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    knex('t_subtitle_folder').where('id', '=', req.params.id).del()
      .then(() => res.send({ message: '删除成功.' }))
      .catch(err => next(err))
  } else {
    res.status(403).send({ error: '只有 admin 账号能管理字幕目录.' })
  }
})

router.get('/mapping', (req, res, next) => {
  const { workId, audioFilename } = req.query
  if (!workId || !audioFilename) {
    return res.status(400).send({ error: 'workId 和 audioFilename 参数必填.' })
  }
  performLazyMatch(workId, audioFilename)
    .then(result => res.send(result))
    .catch(err => next(err))
})

router.get('/file/:id', (req, res, next) => {
  const mappingId = req.params.id
  knex('t_subtitle_mapping').where('id', '=', mappingId).first()
    .then(async (mapping) => {
      if (!mapping) {
        return res.status(404).send({ error: '字幕映射不存在.' })
      }

      let filePath
      if (mapping.subtitle_folder_id === null) {
        const work = await knex('t_work').select('root_folder', 'dir').where('id', '=', mapping.work_id).first()
        if (!work) return res.status(404).send({ error: '作品不存在.' })
        const rootFolder = config.rootFolders.find(rf => rf.name === work.root_folder)
        if (!rootFolder) return res.status(500).send({ error: '找不到根文件夹.' })
        const localParts = [rootFolder.path, work.dir]
        if (mapping.subtitle_relative_path) localParts.push(mapping.subtitle_relative_path)
        localParts.push(mapping.subtitle_filename)
        filePath = path.join(...localParts)
      } else {
        const folder = await knex('t_subtitle_folder').where('id', '=', mapping.subtitle_folder_id).first()
        if (!folder) return res.status(404).send({ error: '字幕目录不存在.' })
        const workDir = findWorkDirInFolder(folder.path, mapping.work_id)
        if (!workDir) return res.status(404).send({ error: '字幕作品目录不存在.' })
        const libParts = [workDir]
        if (mapping.subtitle_relative_path) libParts.push(mapping.subtitle_relative_path)
        libParts.push(mapping.subtitle_filename)
        filePath = path.join(...libParts)
      }

      try {
        const content = readSubtitleFile(filePath)
        res.type('text/plain').send(content)
      } catch (err) {
        res.status(404).send({ error: '字幕文件不存在.' })
      }
    })
    .catch(err => next(err))
})

router.post('/scan', (req, res) => {
  if (!config.auth || req.user.name === 'admin') {
    const scannerPath = path.join(__dirname, '../filesystem/subtitleScanner.js')

    try {
      const scanner = childProcess.fork(scannerPath, { silent: false })

      scanner.on('exit', (code) => {
        if (code) {
          const io = req.app.get('io')
          if (io) io.emit('SUBTITLE_SCAN_ERROR', { message: '字幕扫描进程异常退出.' })
        }
      })

      scanner.on('message', (m) => {
        if (m.event) {
          const io = req.app.get('io')
          if (io) io.emit(m.event, m.payload)
        }
      })

      res.send({ message: '扫描已启动.' })
    } catch (err) {
      res.status(500).send({ error: '启动字幕扫描失败.' })
    }
  } else {
    res.status(403).send({ error: '只有 admin 账号能触发字幕扫描.' })
  }
})

module.exports = router