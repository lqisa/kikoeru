# 桌面字幕功能 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 Kikoeru 添加桌面字幕功能，支持 LRC/VTT 格式、字幕库目录管理、模糊匹配与缓存、多字幕切换。

**架构：** 字幕目录配置存数据库（`t_subtitle_folder`），匹配结果缓存到 `t_subtitle_mapping` 表。匹配优先级：音频同目录 > 字幕库目录。匹配算法采用序号提取 + Levenshtein 相似度两阶段策略。字幕扫描走子进程 + socket.io 通知。前端用 `SubtitlePanel.vue` 替换 `LyricsBar.vue`，支持可拖拽、关闭、切换字幕。

**技术栈：** Node.js (CommonJS)、Express、knex/SQLite3、socket.io、Vue 3 + Quasar、Pinia、lrc-file-parser（已有）

---

## 文件结构

### 后端新增文件
- `apps/backend/database/migrations/20260619000000_subtitle_tables.js` — 数据库迁移：创建 `t_subtitle_folder` 和 `t_subtitle_mapping` 表
- `apps/backend/filesystem/subtitleMatcher.js` — 字幕匹配算法：序号提取 + Levenshtein 相似度
- `apps/backend/filesystem/subtitleScanner.js` — 字幕增量扫描子进程
- `apps/backend/routes/subtitle.js` — 字幕相关 API 路由

### 后端修改文件
- `apps/backend/routes/index.js` — 注册 subtitle 路由
- `apps/backend/socket.js` — 新增字幕扫描 socket 事件处理

### 前端新增文件
- `apps/frontend/src/components/SubtitlePanel.vue` — 字幕显示框（替换 LyricsBar）
- `apps/frontend/src/components/SubtitleSelector.vue` — 字幕选择对话框
- `apps/frontend/src/utils/vttParser.ts` — VTT 格式解析器
- `apps/frontend/src/types/subtitle.ts` — 字幕相关类型定义

### 前端修改文件
- `apps/frontend/src/types/index.ts` — 导出字幕类型
- `apps/frontend/src/types/socket.ts` — 新增字幕扫描 socket 事件类型
- `apps/frontend/src/types/audio.ts` — AudioPlayerState 新增字幕相关字段
- `apps/frontend/src/stores/audioPlayer/state.ts` — 新增字幕相关状态
- `apps/frontend/src/stores/audioPlayer/actions.ts` — 新增字幕相关 actions
- `apps/frontend/src/components/AudioPlayer.vue` — 菜单新增"显示/关闭字幕"
- `apps/frontend/src/components/AudioElement.vue` — 改造字幕加载逻辑
- `apps/frontend/src/components/LyricsBar.vue` — 不再在 MainLayout 中使用（保留文件兼容）
- `apps/frontend/src/layouts/MainLayout.vue` — 替换 LyricsBar 为 SubtitlePanel
- `apps/frontend/src/pages/Dashboard/Advanced.vue` — 新增字幕目录配置卡片

---

## 任务 1：数据库迁移——创建字幕表

**文件：**
- 创建：`apps/backend/database/migrations/20260619000000_subtitle_tables.js`

- [ ] **步骤 1：编写迁移文件**

```js
exports.up = function (knex) {
  return knex.schema
    .createTable('t_subtitle_folder', (table) => {
      table.increments()
      table.string('name')
      table.string('path').notNullable().unique()
    })
    .createTable('t_subtitle_mapping', (table) => {
      table.increments()
      table.string('work_id').notNullable()
      table.string('audio_filename').notNullable()
      table.string('subtitle_filename').notNullable()
      table.integer('subtitle_folder_id').unsigned().nullable()
      table.string('subtitle_type').notNullable()
      table.float('confidence').notNullable()
      table.foreign('work_id').references('id').inTable('t_work').onDelete('CASCADE')
      table.foreign('subtitle_folder_id').references('id').inTable('t_subtitle_folder').onDelete('CASCADE')
    })
    .raw('CREATE INDEX IF NOT EXISTS idx_subtitle_mapping_work ON t_subtitle_mapping(work_id, audio_filename)')
}

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('t_subtitle_mapping')
    .dropTableIfExists('t_subtitle_folder')
}
```

- [ ] **步骤 2：运行迁移验证**

运行：`cd d:\work\kikoeru\apps\backend && node -e "const {knex} = require('./database/db'); const m = require('./database/migrations/20260619000000_subtitle_tables'); m.up(knex).then(() => { console.log('Migration UP OK'); knex.destroy(); }).catch(e => { console.error(e); knex.destroy(); })"`

预期：输出 `Migration UP OK`

- [ ] **步骤 3：验证表结构**

运行：`cd d:\work\kikoeru\apps\backend && node -e "const {knex} = require('./database/db'); knex.raw('PRAGMA table_info(t_subtitle_folder)').then(r => console.log('t_subtitle_folder:', r)).then(() => knex.raw('PRAGMA table_info(t_subtitle_mapping)')).then(r => console.log('t_subtitle_mapping:', r)).then(() => knex.destroy())"`

预期：两张表均有正确的列定义

- [ ] **步骤 4：Commit**

```bash
git add apps/backend/database/migrations/20260619000000_subtitle_tables.js
git commit -m "feat(subtitle): add database migration for subtitle tables"
```

---

## 任务 2：字幕匹配算法

**文件：**
- 创建：`apps/backend/filesystem/subtitleMatcher.js`

- [ ] **步骤 1：编写匹配模块**

```js
const path = require('path')

const extractTrackNumber = (filename) => {
  const name = path.basename(filename, path.extname(filename))
  const patterns = [
    /^(\d+)/,
    /^Track\s*(\d+)/i,
    /^第(\d+)/,
    /^(\d+)\s*[.\-_]/
  ]
  for (const pattern of patterns) {
    const match = name.match(pattern)
    if (match) {
      return parseInt(match[1], 10)
    }
  }
  return null
}

const normalize = (str) => {
  return str
    .replace(path.extname(str) || '', '')
    .replace(/[\uff10-\uff19]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[\uff21-\uff3a\uff41-\uff5a]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/\s+/g, ' ')
    .trim()
}

const levenshteinDistance = (a, b) => {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

const similarity = (a, b) => {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(na, nb) / maxLen
}

const SUBTITLE_EXTENSIONS = new Set(['.lrc', '.vtt'])

const matchSubtitles = (audioFilename, subtitleFiles) => {
  const audioTrackNum = extractTrackNumber(audioFilename)
  const results = []

  for (const sf of subtitleFiles) {
    const ext = path.extname(sf).toLowerCase()
    if (!SUBTITLE_EXTENSIONS.has(ext)) continue

    const subTrackNum = extractTrackNumber(sf)
    let conf = 0

    if (audioTrackNum !== null && subTrackNum !== null && audioTrackNum === subTrackNum) {
      const nameSim = similarity(audioFilename, sf)
      conf = 0.5 + 0.5 * nameSim
    } else {
      const nameSim = similarity(audioFilename, sf)
      conf = nameSim * 0.7
    }

    if (conf >= 0.5) {
      results.push({
        subtitleFilename: path.basename(sf),
        subtitleType: ext === '.lrc' ? 'lrc' : 'vtt',
        confidence: Math.round(conf * 1000) / 1000
      })
    }
  }

  results.sort((a, b) => {
    if (a.subtitleType === 'lrc' && b.subtitleType !== 'lrc') return -1
    if (a.subtitleType !== 'lrc' && b.subtitleType === 'lrc') return 1
    return b.confidence - a.confidence
  })

  return results
}

module.exports = { matchSubtitles, extractTrackNumber, normalize, levenshteinDistance, similarity }
```

- [ ] **步骤 2：运行单元测试验证匹配算法**

运行：`cd d:\work\kikoeru\apps\backend && node -e "const m = require('./filesystem/subtitleMatcher'); console.log(JSON.stringify(m.matchSubtitles('01 はじめまして.mp3', ['01 はじめまして.lrc', '01 おやすみ.lrc', '02 夢の中へ.lrc']), null, 2)); console.log('---'); console.log(JSON.stringify(m.matchSubtitles('01 ようこそ.mp3', ['01 ようこそ！.lrc']), null, 2)); console.log('---'); console.log(JSON.stringify(m.matchSubtitles('01 test.mp3', ['01 test.vtt', '01 test.lrc']), null, 2))"`

预期：
- 第一个测试：`01 はじめまして.lrc` confidence 最高，`01 おやすみ.lrc` 较低，`02 夢の中へ.lrc` 不在结果中
- 第二个测试：`01 ようこそ！.lrc` confidence > 0.7
- 第三个测试：lrc 排在 vtt 前面

- [ ] **步骤 3：Commit**

```bash
git add apps/backend/filesystem/subtitleMatcher.js
git commit -m "feat(subtitle): add subtitle matching algorithm with track number + Levenshtein"
```

---

## 任务 3：字幕 API 路由

**文件：**
- 创建：`apps/backend/routes/subtitle.js`
- 修改：`apps/backend/routes/index.js`

- [ ] **步骤 1：编写字幕路由**

```js
const express = require('express')
const router = express.Router()
const fs = require('fs')
const path = require('path')
const jschardet = require('jschardet')
const iconv = require('iconv-lite')
const { knex } = require('../database/db')
const { config } = require('../config')
const { matchSubtitles } = require('../filesystem/subtitleMatcher')
const { getTrackList } = require('../filesystem/utils')

const SUBTITLE_EXTENSIONS = new Set(['.lrc', '.vtt'])

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

  const entries = fs.readdirSync(workDir, { withFileTypes: true })
  const subtitleFiles = entries
    .filter(e => e.isFile() && SUBTITLE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
    .map(e => e.name)

  if (subtitleFiles.length === 0) return []

  const matches = matchSubtitles(audioFilename, subtitleFiles)
  return matches.map(m => ({
    ...m,
    source: 'local',
    folderPath: workDir,
    subtitle_folder_id: null
  }))
}

const findSubtitlesInLibrary = async (workId, audioFilename) => {
  const folders = await knex('t_subtitle_folder').select('*')
  const results = []

  for (const folder of folders) {
    const workDir = path.join(folder.path, workId)
    if (!fs.existsSync(workDir)) continue

    let entries
    try {
      entries = fs.readdirSync(workDir, { withFileTypes: true })
    } catch (_) {
      continue
    }

    const subtitleFiles = entries
      .filter(e => e.isFile() && SUBTITLE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
      .map(e => e.name)

    if (subtitleFiles.length === 0) continue

    const matches = matchSubtitles(audioFilename, subtitleFiles)
    for (const m of matches) {
      results.push({
        ...m,
        source: 'library',
        folderPath: workDir,
        subtitle_folder_id: folder.id
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
        source: e.subtitle_folder_id === null ? 'local' : 'library'
      })),
      subtitleMissing: false
    }
  }

  const localResults = await findSubtitlesInWorkDir(workId, audioFilename)
  const libraryResults = await findSubtitlesInLibrary(workId, audioFilename)
  const allResults = [...localResults, ...libraryResults]

  if (allResults.length === 0) {
    const workDir = await knex('t_subtitle_folder').select('*')
    const hasLibrary = workDir.length > 0
    return {
      mappings: [],
      subtitleMissing: hasLibrary || localResults.length === 0
    }
  }

  const rows = allResults.map(r => ({
    work_id: workId,
    audio_filename: audioFilename,
    subtitle_filename: r.subtitleFilename,
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
      source: e.subtitle_folder_id === null ? 'local' : 'library'
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
    const { name, path: folderPath } = req.body
    if (!folderPath) {
      return res.status(400).send({ error: '路径不能为空.' })
    }
    knex('t_subtitle_folder').insert({ name: name || null, path: folderPath })
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
    .then(mapping => {
      if (!mapping) {
        return res.status(404).send({ error: '字幕映射不存在.' })
      }

      let filePath
      if (mapping.subtitle_folder_id === null) {
        return knex('t_work').select('root_folder', 'dir').where('id', '=', mapping.work_id).first()
          .then(work => {
            if (!work) return res.status(404).send({ error: '作品不存在.' })
            const rootFolder = config.rootFolders.find(rf => rf.name === work.root_folder)
            if (!rootFolder) return res.status(500).send({ error: '找不到根文件夹.' })
            filePath = path.join(rootFolder.path, work.dir, mapping.subtitle_filename)
            try {
              const content = readSubtitleFile(filePath)
              res.type('text/plain').send(content)
            } catch (err) {
              res.status(404).send({ error: '字幕文件不存在.' })
            }
          })
      } else {
        return knex('t_subtitle_folder').where('id', '=', mapping.subtitle_folder_id).first()
          .then(folder => {
            if (!folder) return res.status(404).send({ error: '字幕目录不存在.' })
            filePath = path.join(folder.path, mapping.work_id, mapping.subtitle_filename)
            try {
              const content = readSubtitleFile(filePath)
              res.type('text/plain').send(content)
            } catch (err) {
              res.status(404).send({ error: '字幕文件不存在.' })
            }
          })
      }
    })
    .catch(err => next(err))
})

router.post('/scan', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    if (!res.app.get('subtitleScanner')) {
      res.send({ message: '扫描已启动.' })
      next()
    } else {
      res.status(409).send({ error: '字幕扫描正在进行中.' })
    }
  } else {
    res.status(403).send({ error: '只有 admin 账号能触发字幕扫描.' })
  }
})

module.exports = router
```

- [ ] **步骤 2：注册路由到 routes/index.js**

在 `apps/backend/routes/index.js` 中，在 `router.use('/media', require('./media'))` 之后添加：

```js
router.use('/subtitle', require('./subtitle'))
```

- [ ] **步骤 3：验证路由注册**

运行：`cd d:\work\kikoeru\apps\backend && node -e "const r = require('./routes/index.js'); console.log('Route registered OK')"`

预期：输出 `Route registered OK`（无报错）

- [ ] **步骤 4：Commit**

```bash
git add apps/backend/routes/subtitle.js apps/backend/routes/index.js
git commit -m "feat(subtitle): add subtitle API routes for folders, mapping, and file serving"
```

---

## 任务 4：字幕扫描子进程 + Socket 事件

**文件：**
- 创建：`apps/backend/filesystem/subtitleScanner.js`
- 修改：`apps/backend/socket.js`

- [ ] **步骤 1：编写字幕扫描子进程**

```js
const fs = require('fs')
const path = require('path')
const { knex } = require('../database/db')
const { matchSubtitles } = require('./subtitleMatcher')

const SUBTITLE_EXTENSIONS = new Set(['.lrc', '.vtt'])
const WORK_ID_PATTERN = /^(RJ|VJ)\d+$/i

const scan = async () => {
  let added = 0
  let removed = 0

  try {
    const folders = await knex('t_subtitle_folder').select('*')

    for (const folder of folders) {
      if (!fs.existsSync(folder.path)) {
        process.send({ event: 'SUBTITLE_SCAN_PROGRESS', payload: { message: `目录不可访问: ${folder.path}` } })
        continue
      }

      let entries
      try {
        entries = fs.readdirSync(folder.path, { withFileTypes: true })
      } catch (err) {
        process.send({ event: 'SUBTITLE_SCAN_PROGRESS', payload: { message: `无法读取目录: ${folder.path}` } })
        continue
      }

      const workDirs = entries.filter(e => e.isDirectory() && WORK_ID_PATTERN.test(e.name))

      for (const workDir of workDirs) {
        const workId = workDir.name.toUpperCase()
        const fullWorkPath = path.join(folder.path, workDir.name)

        let subEntries
        try {
          subEntries = fs.readdirSync(fullWorkPath, { withFileTypes: true })
        } catch (_) {
          continue
        }

        const subtitleFiles = subEntries
          .filter(e => e.isFile() && SUBTITLE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
          .map(e => e.name)

        const existingMappings = await knex('t_subtitle_mapping')
          .where('work_id', workId)
          .where('subtitle_folder_id', folder.id)
          .select('*')

        const existingFiles = new Set(existingMappings.map(m => m.subtitle_filename))
        const currentFiles = new Set(subtitleFiles)

        for (const sf of subtitleFiles) {
          if (!existingFiles.has(sf)) {
            const work = await knex('t_work').select('id').where('id', workId).first()
            if (!work) continue

            const audioTracks = await knex('t_work')
              .join('t_work as w', 'w.id', workId)
              .select('id')
              .first()

            const matches = matchSubtitles(sf, subtitleFiles.filter(f => f !== sf))
            const ext = path.extname(sf).toLowerCase()
            const row = {
              work_id: workId,
              audio_filename: sf,
              subtitle_filename: sf,
              subtitle_folder_id: folder.id,
              subtitle_type: ext === '.lrc' ? 'lrc' : 'vtt',
              confidence: 1.0
            }
            await knex('t_subtitle_mapping').insert(row)
            added++
          }
        }

        for (const existing of existingMappings) {
          if (!currentFiles.has(existing.subtitle_filename)) {
            await knex('t_subtitle_mapping').where('id', existing.id).del()
            removed++
          }
        }
      }
    }

    process.send({
      event: 'SUBTITLE_SCAN_FINISHED',
      payload: { message: '字幕扫描完成.', added, removed }
    })
  } catch (err) {
    process.send({
      event: 'SUBTITLE_SCAN_ERROR',
      payload: { message: `字幕扫描失败: ${err.message}` }
    })
  }

  process.exit(0)
}

scan()
```

- [ ] **步骤 2：修改 socket.js 添加字幕扫描事件**

在 `apps/backend/socket.js` 中，在 `let scanner = null` 之后添加 `let subtitleScanner = null`，在 `socket.on('KILL_SCAN_PROCESS', ...)` 之后添加：

```js
    socket.on('PERFORM_SUBTITLE_SCAN', () => {
      if (!subtitleScanner) {
        subtitleScanner = childProcess.fork(path.join(__dirname, './filesystem/subtitleScanner.js'), { silent: false })
        subtitleScanner.on('exit', (code) => {
          subtitleScanner = null
          if (code) {
            io.emit('SUBTITLE_SCAN_ERROR', { message: '字幕扫描进程异常退出.' })
          }
        })

        subtitleScanner.on('message', (m) => {
          if (m.event) {
            io.emit(m.event, m.payload)
          }
        })
      }
    })

    socket.on('KILL_SUBTITLE_SCAN_PROCESS', () => {
      if (subtitleScanner) {
        subtitleScanner.send({ exit: 1 })
      }
    })
```

同时在 `app` 对象上存储 scanner 引用供路由使用——在 `io.on('connection', function (socket) {` 之前添加：

```js
  const app = server.listener ? server.listener : null
```

- [ ] **步骤 3：修改 subtitle 路由的 scan 端点以触发子进程**

将 `apps/backend/routes/subtitle.js` 中 `router.post('/scan', ...)` 的实现改为：

```js
router.post('/scan', (req, res, next) => {
  if (!config.auth || req.user.name === 'admin') {
    const io = req.app.get('io')
    if (!io) {
      return res.status(500).send({ error: 'Socket.io 未初始化.' })
    }
    const sockets = await io.sockets.sockets
    if (sockets.size > 0) {
      const socket = sockets.values().next().value
      socket.emit('PERFORM_SUBTITLE_SCAN')
    }
    res.send({ message: '扫描已启动.' })
  } else {
    res.status(403).send({ error: '只有 admin 账号能触发字幕扫描.' })
  }
})
```

注意：此处需要将回调改为 async 或使用 socket.io 的 io 实例直接触发。更简洁的方式是在路由中直接 fork 子进程。最终方案：

```js
router.post('/scan', (req, res) => {
  if (!config.auth || req.user.name === 'admin') {
    const childProcess = require('child_process')
    const scannerPath = path.join(__dirname, '../filesystem/subtitleScanner.js')
    const scanner = childProcess.fork(scannerPath, { silent: false })

    scanner.on('exit', (code) => {
      if (code) {
        req.app.get('io')?.emit('SUBTITLE_SCAN_ERROR', { message: '字幕扫描进程异常退出.' })
      }
    })

    scanner.on('message', (m) => {
      if (m.event) {
        req.app.get('io')?.emit(m.event, m.payload)
      }
    })

    res.send({ message: '扫描已启动.' })
  } else {
    res.status(403).send({ error: '只有 admin 账号能触发字幕扫描.' })
  }
})
```

需要在 `app.js` 中将 `io` 实例挂到 express app 上：`app.set('io', io)`。

- [ ] **步骤 4：在 app.js 中挂载 io 实例**

在 `apps/backend/app.js` 中，`initSocket(server)` 调用之后，添加 `app.set('io', io)`。需要将 `initSocket` 的返回值改为返回 `io` 实例，或者修改 `initSocket` 接受 `app` 参数。

修改 `socket.js` 的 `initSocket` 函数签名和末尾：

```js
const initSocket = (server, app) => {
  const io = new Server(server, { ... })
  // ... 现有代码 ...
  if (app) {
    app.set('io', io)
  }
  return io
}
```

修改 `app.js` 中的调用：`const io = initSocket(server, app)`

- [ ] **步骤 5：Commit**

```bash
git add apps/backend/filesystem/subtitleScanner.js apps/backend/socket.js apps/backend/routes/subtitle.js apps/backend/app.js
git commit -m "feat(subtitle): add subtitle scanner subprocess and socket.io events"
```

---

## 任务 5：前端字幕类型定义

**文件：**
- 创建：`apps/frontend/src/types/subtitle.ts`
- 修改：`apps/frontend/src/types/index.ts`
- 修改：`apps/frontend/src/types/socket.ts`
- 修改：`apps/frontend/src/types/audio.ts`

- [ ] **步骤 1：创建字幕类型文件**

`apps/frontend/src/types/subtitle.ts`：

```ts
export type SubtitleFolder = {
  id: number
  name: string | null
  path: string
}

export type SubtitleMapping = {
  id: number
  subtitleFilename: string
  subtitleType: 'lrc' | 'vtt'
  confidence: number
  source: 'local' | 'library'
}

export type SubtitleMappingResponse = {
  mappings: SubtitleMapping[]
  subtitleMissing: boolean
}

export type SubtitleFoldersResponse = {
  folders: SubtitleFolder[]
}

export type VttCue = {
  startTime: number
  endTime: number
  text: string
}
```

- [ ] **步骤 2：在 types/index.ts 中导出字幕类型**

在 `apps/frontend/src/types/index.ts` 末尾添加：

```ts
export type {
  SubtitleFolder,
  SubtitleMapping,
  SubtitleMappingResponse,
  SubtitleFoldersResponse,
  VttCue,
} from './subtitle';
```

- [ ] **步骤 3：在 socket.ts 中添加字幕扫描事件类型**

在 `apps/frontend/src/types/socket.ts` 的 `SocketEvents` 类型中，`SCAN_FINISHED` 之后添加：

```ts
  SUBTITLE_SCAN_FINISHED: (payload: { message: string; added: number; removed: number }) => void;
  SUBTITLE_SCAN_ERROR: (payload: { message: string }) => void;
```

- [ ] **步骤 4：在 audio.ts 中添加字幕相关状态字段**

在 `apps/frontend/src/types/audio.ts` 的 `AudioPlayerState` 类型中，`forwardSeekMode` 之后添加：

```ts
  subtitleVisible: boolean;
  currentSubtitleList: SubtitleMapping[];
  currentSubtitleType: string;
```

同时在文件顶部添加 import：

```ts
import type { SubtitleMapping } from './subtitle';
```

- [ ] **步骤 5：Commit**

```bash
git add apps/frontend/src/types/subtitle.ts apps/frontend/src/types/index.ts apps/frontend/src/types/socket.ts apps/frontend/src/types/audio.ts
git commit -m "feat(subtitle): add frontend type definitions for subtitle feature"
```

---

## 任务 6：前端 Store 扩展

**文件：**
- 修改：`apps/frontend/src/stores/audioPlayer/state.ts`
- 修改：`apps/frontend/src/stores/audioPlayer/actions.ts`

- [ ] **步骤 1：扩展 state**

在 `apps/frontend/src/stores/audioPlayer/state.ts` 中，`forwardSeekMode: false,` 之后添加：

```ts
    subtitleVisible: false,
    currentSubtitleList: [],
    currentSubtitleType: '',
```

- [ ] **步骤 2：扩展 actions**

在 `apps/frontend/src/stores/audioPlayer/actions.ts` 中，`CLEAR_SLEEP_MODE` 方法之后添加：

```ts
  TOGGLE_SUBTITLE_VISIBLE(this: AudioPlayerState) {
    this.subtitleVisible = !this.subtitleVisible
  },
  SET_SUBTITLE_VISIBLE(this: AudioPlayerState, value: boolean) {
    this.subtitleVisible = value
  },
  SET_SUBTITLE_LIST(this: AudioPlayerState, list: SubtitleMapping[]) {
    this.currentSubtitleList = list
  },
  SET_SUBTITLE_TYPE(this: AudioPlayerState, type: string) {
    this.currentSubtitleType = type
  },
```

同时在文件顶部 import 中添加 `SubtitleMapping`：

```ts
import type { AudioPlayerState, AudioTrack, SubtitleMapping } from '../../types';
```

注意：需要确保 `SubtitleMapping` 从 `../../types` 导出链中可用。

- [ ] **步骤 3：Commit**

```bash
git add apps/frontend/src/stores/audioPlayer/state.ts apps/frontend/src/stores/audioPlayer/actions.ts
git commit -m "feat(subtitle): extend audioPlayer store with subtitle state and actions"
```

---

## 任务 7：VTT 解析器

**文件：**
- 创建：`apps/frontend/src/utils/vttParser.ts`

- [ ] **步骤 1：编写 VTT 解析器**

```ts
import type { VttCue } from '../types/subtitle'

const parseVtt = (vttText: string): VttCue[] => {
  const cues: VttCue[] = []
  const lines = vttText.replace(/\r\n/g, '\n').split('\n')
  let i = 0

  while (i < lines.length && !lines[i].includes('WEBVTT')) {
    i++
  }
  i++

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i++
      continue
    }

    if (line.includes('-->')) {
      const timeMatch = line.match(
        /(\d{0,2}:?\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{0,2}:?\d{2}:\d{2}\.\d{3})/
      )
      if (timeMatch) {
        const startTime = parseTimestamp(timeMatch[1])
        const endTime = parseTimestamp(timeMatch[2])
        i++
        const textLines: string[] = []
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i].trim())
          i++
        }
        if (textLines.length > 0) {
          cues.push({ startTime, endTime, text: textLines.join(' ') })
        }
      } else {
        i++
      }
    } else {
      i++
    }
  }

  return cues
}

const parseTimestamp = (ts: string): number => {
  const parts = ts.split(':')
  if (parts.length === 3) {
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    const seconds = parseFloat(parts[2])
    return hours * 3600000 + minutes * 60000 + seconds * 1000
  } else if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10)
    const seconds = parseFloat(parts[1])
    return minutes * 60000 + seconds * 1000
  }
  return 0
}

export { parseVtt }
```

- [ ] **步骤 2：验证 VTT 解析器**

运行：`cd d:\work\kikoeru\apps\frontend && npx tsx -e "import {parseVtt} from './src/utils/vttParser'; const r = parseVtt('WEBVTT\\n\\n00:00:01.000 --> 00:00:05.000\\nHello World\\n\\n00:00:05.500 --> 00:00:10.000\\nSecond line'); console.log(JSON.stringify(r, null, 2))"`

预期：输出两个 cue 对象，startTime/endTime 正确

- [ ] **步骤 3：Commit**

```bash
git add apps/frontend/src/utils/vttParser.ts
git commit -m "feat(subtitle): add VTT parser utility"
```

---

## 任务 8：SubtitlePanel 组件

**文件：**
- 创建：`apps/frontend/src/components/SubtitlePanel.vue`

- [ ] **步骤 1：编写 SubtitlePanel 组件**

```vue
<template>
  <q-card
    v-show="store.subtitleVisible"
    id="subtitle-panel"
    class="absolute"
    :style="panelStyle"
    @mousedown="onCursorDown"
    @mouseup="onCursorUp"
    @touchstart="onCursorDown"
    @touchend="onCursorUp"
  >
    <div class="row items-center justify-end q-pa-xs" style="min-height: 28px">
      <q-btn flat round dense size="xs" icon="translate" @click.stop="showSelector = true">
        <q-tooltip>切换字幕</q-tooltip>
      </q-btn>
      <q-btn flat round dense size="xs" icon="close" @click.stop="store.TOGGLE_SUBTITLE_VISIBLE()">
        <q-tooltip>关闭字幕</q-tooltip>
      </q-btn>
    </div>
    <div class="text-center text-subtitle1 text-bold ellipsis-2-lines text-purple q-px-sm q-pb-sm">
      {{ currentLyric }}
    </div>
    <SubtitleSelector v-model="showSelector" />
  </q-card>
</template>

<script setup lang="ts">
import { computed, reactive, ref, onMounted, onBeforeUnmount } from 'vue'
import { useAudioPlayerStore } from '../stores/audioPlayer'
import SubtitleSelector from './SubtitleSelector.vue'

const store = useAudioPlayerStore()
const showSelector = ref(false)

const currentLyric = computed(() => store.currentLyric)

const dragState = reactive({
  beTouched: false,
  startX: 0,
  startY: 0,
  posX: 0,
  posY: 0,
})

const panelStyle = computed(() => ({
  left: dragState.posX + 'px',
  bottom: '0px',
  backgroundColor: 'rgba(245, 245, 245, 0.6)',
  minWidth: '200px',
  maxWidth: '400px',
  zIndex: 2000,
}))

const getTouch = (ev: MouseEvent | TouchEvent) => {
  return (ev as TouchEvent).touches ? (ev as TouchEvent).touches[0] : (ev as MouseEvent)
}

const onCursorMove = (ev: MouseEvent | TouchEvent) => {
  if (!dragState.beTouched) return
  const touch = getTouch(ev)
  if (!touch) return
  dragState.posX = touch.clientX - dragState.startX
}

const onCursorDown = (ev: MouseEvent | TouchEvent) => {
  ev.preventDefault()
  dragState.beTouched = true
  const touch = getTouch(ev)
  if (!touch) return
  const panel = document.getElementById('subtitle-panel')
  if (!panel) return
  dragState.startX = touch.clientX - dragState.posX
}

const onCursorUp = (ev: MouseEvent | TouchEvent) => {
  ev.preventDefault()
  dragState.beTouched = false
}

onMounted(() => {
  addEventListener('mousemove', onCursorMove, false)
  addEventListener('touchmove', onCursorMove, false)
})

onBeforeUnmount(() => {
  removeEventListener('mousemove', onCursorMove, false)
  removeEventListener('touchmove', onCursorMove, false)
})
</script>
```

- [ ] **步骤 2：Commit**

```bash
git add apps/frontend/src/components/SubtitlePanel.vue
git commit -m "feat(subtitle): add SubtitlePanel component with drag, close, and switch buttons"
```

---

## 任务 9：SubtitleSelector 组件

**文件：**
- 创建：`apps/frontend/src/components/SubtitleSelector.vue`

- [ ] **步骤 1：编写 SubtitleSelector 组件**

```vue
<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="min-width: 300px; max-height: 400px">
      <q-toolbar>
        <q-toolbar-title>选择字幕</q-toolbar-title>
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-toolbar>

      <q-separator />

      <q-list v-if="store.currentSubtitleList.length > 0" style="max-height: 300px" class="scroll">
        <q-item
          v-for="mapping in store.currentSubtitleList"
          :key="mapping.id"
          clickable
          v-ripple
          :active="store.currentSubtitleType === mapping.subtitleType && selectedFilename === mapping.subtitleFilename"
          active-class="text-white bg-teal"
          @click="selectSubtitle(mapping)"
        >
          <q-item-section>
            <q-item-label lines="1">{{ mapping.subtitleFilename }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge :color="mapping.subtitleType === 'lrc' ? 'primary' : 'orange'" :label="mapping.subtitleType.toUpperCase()" />
          </q-item-section>
          <q-item-section side>
            <q-badge :color="mapping.source === 'local' ? 'teal' : 'purple'" :label="mapping.source === 'local' ? '本地' : '字幕库'" />
          </q-item-section>
        </q-item>
      </q-list>

      <q-item v-else>
        <q-item-section class="text-center text-grey">
          <q-item-label>字幕库中缺少字幕</q-item-label>
        </q-item-section>
      </q-item>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAudioPlayerStore } from '../stores/audioPlayer'
import type { SubtitleMapping } from '../types'

defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()

const store = useAudioPlayerStore()
const selectedFilename = ref('')

watch(() => store.currentSubtitleList, (list) => {
  if (list.length > 0 && !selectedFilename.value) {
    selectedFilename.value = list[0].subtitleFilename
    store.SET_SUBTITLE_TYPE(list[0].subtitleType)
  }
}, { immediate: true })

const selectSubtitle = (mapping: SubtitleMapping) => {
  selectedFilename.value = mapping.subtitleFilename
  store.SET_SUBTITLE_TYPE(mapping.subtitleType)
}
</script>
```

- [ ] **步骤 2：Commit**

```bash
git add apps/frontend/src/components/SubtitleSelector.vue
git commit -m "feat(subtitle): add SubtitleSelector dialog component"
```

---

## 任务 10：AudioPlayer 菜单添加字幕开关

**文件：**
- 修改：`apps/frontend/src/components/AudioPlayer.vue`

- [ ] **步骤 1：在菜单中添加"显示/关闭字幕"项**

在 `apps/frontend/src/components/AudioPlayer.vue` 的 `q-menu` 中，"打开作品详情" `q-item` 之后添加：

```html
              <q-item clickable v-ripple @click="toggleSubtitle()">
                <q-item-section avatar>
                  <q-icon :name="store.subtitleVisible ? 'done' : ''" />
                </q-item-section>
                <q-item-section>显示/关闭字幕</q-item-section>
              </q-item>
```

在 `<script setup>` 部分添加方法：

```ts
const toggleSubtitle = () => {
  store.TOGGLE_SUBTITLE_VISIBLE()
}
```

- [ ] **步骤 2：Commit**

```bash
git add apps/frontend/src/components/AudioPlayer.vue
git commit -m "feat(subtitle): add subtitle toggle menu item in AudioPlayer"
```

---

## 任务 11：AudioElement 改造字幕加载逻辑

**文件：**
- 修改：`apps/frontend/src/components/AudioElement.vue`

- [ ] **步骤 1：改造 loadLrcFile 方法**

将 `apps/frontend/src/components/AudioElement.vue` 中的 `loadLrcFile` 函数替换为：

```ts
const loadSubtitleFile = () => {
  const token = getToken()
  const currentTrack = store.queue[store.queueIndex]
  if (!currentTrack?.hash) return

  const workId = currentTrack.hash.split('/')[0]
  const audioFilename = currentTrack.title || ''

  void api
    .get<SubtitleMappingResponse>(`/api/subtitle/mapping?workId=${workId}&audioFilename=${encodeURIComponent(audioFilename)}`)
    .then((response) => {
      const { mappings, subtitleMissing } = response.data
      store.SET_SUBTITLE_LIST(mappings)

      if (mappings.length > 0) {
        const best = mappings[0]
        store.SET_SUBTITLE_TYPE(best.subtitleType)
        loadSubtitleContent(best.id, best.subtitleType)
      } else {
        lrcAvailable.value = false
        lrcObj.value?.setLyric('')
        store.SET_CURRENT_LYRIC(subtitleMissing ? '字幕库中缺少字幕' : '')
      }
    })
    .catch((error: unknown) => {
      const err = error as {
        response?: { status: number; data?: { error?: string }; statusText?: string };
        message?: string;
      }
      if (err.response) {
        if (err.response.status !== 401) {
          showErrNotif(
            err.response.data?.error || `${err.response.status} ${err.response.statusText}`,
          )
        }
      } else {
        showErrNotif(err.message || 'unknown')
      }
    })
}

const loadSubtitleContent = (mappingId: number, type: string) => {
  const token = getToken()
  const url = `/api/subtitle/file/${mappingId}?token=${token}`

  void api.get<string>(url).then((response) => {
    if (type === 'lrc') {
      lrcAvailable.value = true
      lrcObj.value?.setLyric(response.data)
      if (player) {
        lrcObj.value?.play(player.currentTime * 1000)
      }
    } else if (type === 'vtt') {
      lrcAvailable.value = true
      const cues = parseVtt(response.data)
      vttCues.value = cues
      if (player) {
        updateVttLyric(player.currentTime * 1000)
      }
    }
  })
}
```

- [ ] **步骤 2：添加 VTT 相关变量和逻辑**

在 `AudioElement.vue` 的 `<script setup>` 中添加：

```ts
import { parseVtt } from '../utils/vttParser'
import type { SubtitleMappingResponse, VttCue } from '../types'

const vttCues = ref<VttCue[]>([])

const updateVttLyric = (currentTimeMs: number) => {
  const cue = vttCues.value.find(
    c => currentTimeMs >= c.startTime && currentTimeMs <= c.endTime
  )
  store.SET_CURRENT_LYRIC(cue?.text || '')
}
```

修改 `player.on('timeupdate', ...)` 回调，在现有逻辑之后添加 VTT 时间更新：

```ts
  player.on('timeupdate', () => {
    if (!player) return
    store.SET_CURRENT_TIME(player.currentTime)
    if (vttCues.value.length > 0) {
      updateVttLyric(player.currentTime * 1000)
    }
    // ... 现有 sleep mode 逻辑
  })
```

- [ ] **步骤 3：替换 watch 中的 loadLrcFile 调用**

将 `watch(source, ...)` 中的 `loadLrcFile()` 调用替换为 `loadSubtitleFile()`

将 `onMounted` 中的 `if (source.value) { loadLrcFile() }` 替换为 `if (source.value) { loadSubtitleFile() }`

- [ ] **步骤 4：添加字幕切换 watcher**

在 `AudioElement.vue` 中添加：

```ts
watch(
  () => store.currentSubtitleType,
  () => {
    if (!store.subtitleVisible) return
    const best = store.currentSubtitleList.find(
      m => m.subtitleType === store.currentSubtitleType
    )
    if (best) {
      loadSubtitleContent(best.id, best.subtitleType)
    }
  },
)
```

- [ ] **步骤 5：Commit**

```bash
git add apps/frontend/src/components/AudioElement.vue
git commit -m "feat(subtitle): refactor AudioElement to use subtitle API with LRC and VTT support"
```

---

## 任务 12：MainLayout 替换 LyricsBar 为 SubtitlePanel

**文件：**
- 修改：`apps/frontend/src/layouts/MainLayout.vue`

- [ ] **步骤 1：替换组件导入和使用**

将 `import LyricsBar from 'components/LyricsBar.vue'` 替换为 `import SubtitlePanel from 'components/SubtitlePanel.vue'`

将模板中 `<LyricsBar />` 替换为 `<SubtitlePanel />`

- [ ] **步骤 2：Commit**

```bash
git add apps/frontend/src/layouts/MainLayout.vue
git commit -m "feat(subtitle): replace LyricsBar with SubtitlePanel in MainLayout"
```

---

## 任务 13：高级设置页面添加字幕目录配置

**文件：**
- 修改：`apps/frontend/src/pages/Dashboard/Advanced.vue`

- [ ] **步骤 1：添加字幕目录配置卡片**

在 `apps/frontend/src/pages/Dashboard/Advanced.vue` 的播放器设置 `q-card` 之后，保存按钮之前，添加字幕目录配置卡片：

```html
    <q-card class="q-ma-md">
      <q-toolbar><q-toolbar-title>字幕目录</q-toolbar-title></q-toolbar>
      <q-form @submit="onAddSubtitleFolder" class="q-pa-sm">
        <q-input outlined dense v-model="subtitleFolder.name" label="别名（可选）" />
        <q-input
          outlined
          dense
          v-model="subtitleFolder.path"
          required
          lazy-rules
          :rules="[(v: string) => !subtitleFolders.find((f: SubtitleFolder) => f.path === v) || '路径已存在']"
          label="绝对路径"
          class="q-mt-sm"
        >
          <template #after>
            <q-btn flat round color="primary" icon="folder_open" @click="showSubtitleBrowser = true">
              <q-tooltip>浏览目录</q-tooltip>
            </q-btn>
          </template>
        </q-input>
        <folder-browser v-model="showSubtitleBrowser" @ok="onSubtitleFolderSelected" />
        <div class="row justify-end">
          <q-btn type="submit" color="primary" label="添加" />
        </div>
      </q-form>

      <q-list v-if="subtitleFolders.length" class="q-pb-sm">
        <q-item v-for="folder in subtitleFolders" :key="folder.id">
          <q-item-section avatar><q-icon color="amber" name="folder" /></q-item-section>
          <q-item-section>
            <q-item-label>{{ folder.name || folder.path }}</q-item-label>
            <q-item-label v-if="folder.name" caption>{{ folder.path }}</q-item-label>
          </q-item-section>
          <q-item-section avatar>
            <q-btn flat round color="red" icon="delete" @click="removeSubtitleFolder(folder.id)" />
          </q-item-section>
        </q-item>
      </q-list>

      <div class="q-pa-sm row justify-end">
        <q-btn label="扫描字幕库" color="primary" @click="scanSubtitles" :loading="subtitleScanning" />
      </div>
    </q-card>
```

- [ ] **步骤 2：添加字幕目录相关 script 逻辑**

在 `<script setup>` 中添加：

```ts
import FolderBrowser from '../../components/FolderBrowser.vue'
import type { SubtitleFolder, SubtitleFoldersResponse } from '../../types'
import { useSocket } from '../../composables/useSocket'

const subtitleFolder = ref<{ name: string; path: string }>({ name: '', path: '' })
const subtitleFolders = ref<SubtitleFolder[]>([])
const showSubtitleBrowser = ref(false)
const subtitleScanning = ref(false)

const socket = useSocket()

socket.registerEvent<{ message: string; added: number; removed: number }>(
  'SUBTITLE_SCAN_FINISHED',
  (payload) => {
    subtitleScanning.value = false
    showSuccNotif(`${payload.message} 新增: ${payload.added}, 移除: ${payload.removed}`)
  }
)

socket.registerEvent<{ message: string }>(
  'SUBTITLE_SCAN_ERROR',
  (payload) => {
    subtitleScanning.value = false
    showErrNotif(payload.message)
  }
)

const loadSubtitleFolders = () => {
  api.get<SubtitleFoldersResponse>('/api/subtitle/folders').then((r) => {
    subtitleFolders.value = r.data.folders
  })
}

const onAddSubtitleFolder = () => {
  api.post('/api/subtitle/folders', subtitleFolder.value).then(() => {
    subtitleFolder.value = { name: '', path: '' }
    loadSubtitleFolders()
  })
}

const onSubtitleFolderSelected = (dirPath: string) => {
  subtitleFolder.value.path = dirPath
}

const removeSubtitleFolder = (id: number) => {
  api.delete(`/api/subtitle/folders/${id}`).then(() => {
    loadSubtitleFolders()
  })
}

const scanSubtitles = () => {
  subtitleScanning.value = true
  api.post('/api/subtitle/scan')
}
```

在 `onMounted` 中添加 `loadSubtitleFolders()` 调用。

- [ ] **步骤 3：Commit**

```bash
git add apps/frontend/src/pages/Dashboard/Advanced.vue
git commit -m "feat(subtitle): add subtitle folder configuration and scan button to Advanced settings"
```

---

## 任务 14：端到端集成验证

- [ ] **步骤 1：启动后端服务**

运行：`cd d:\work\kikoeru\apps\backend && node app.js`

预期：服务启动无报错，迁移执行成功

- [ ] **步骤 2：启动前端开发服务**

运行：`cd d:\work\kikoeru\apps\frontend && npx quasar dev`

预期：编译无类型错误

- [ ] **步骤 3：验证字幕目录 CRUD**

在浏览器中访问高级设置页面，添加/删除字幕目录，验证 API 调用正常。

- [ ] **步骤 4：验证字幕匹配**

播放一个有字幕文件的音频，点击"显示/关闭字幕"，验证字幕显示。

- [ ] **步骤 5：验证字幕切换**

点击字幕框上的切换按钮，验证字幕选择对话框和切换功能。

- [ ] **步骤 6：验证扫描功能**

在高级设置页面点击"扫描字幕库"，验证 socket.io 通知正常接收。

- [ ] **步骤 7：最终 Commit**

```bash
git add -A
git commit -m "feat(subtitle): complete subtitle feature integration"
```