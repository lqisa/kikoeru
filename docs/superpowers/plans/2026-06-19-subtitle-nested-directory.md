# 字幕嵌套目录支持 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 支持字幕目录嵌套子目录递归扫描，新增 `subtitle_relative_path` 字段存储子目录路径，新增 `scan_depth` 配置扫描深度。

**架构：** 在 `t_subtitle_mapping` 表新增 `subtitle_relative_path` 字段存储相对路径，`t_subtitle_folder` 表新增 `scan_depth` 字段。扫描器改为递归遍历，受 `scan_depth` 控制。路由读取字幕文件时拼接 `relative_path`。前端 Advanced 页面增加深度设置 UI。

**技术栈：** Node.js (CommonJS)、Express、knex/SQLite3、Vue 3 + Quasar

---

## 文件结构

### 修改文件
- `apps/backend/database/migrations/20260619000000_subtitle_tables.js` — 新增 `subtitle_relative_path` 和 `scan_depth` 字段
- `apps/backend/filesystem/subtitleScanner.js` — 递归扫描 + 读取 scan_depth + 存储 relative_path
- `apps/backend/routes/subtitle.js` — 读取路径拼接 + 递归懒匹配 + PATCH 路由
- `apps/frontend/src/types/subtitle.ts` — SubtitleFolder 新增 scan_depth
- `apps/frontend/src/pages/Dashboard/Advanced.vue` — 扫描深度 UI

---

## 任务 1：数据库迁移——新增字段

**文件：**
- 修改：`apps/backend/database/migrations/20260619000000_subtitle_tables.js`

- [ ] **步骤 1：修改迁移文件**

在 `t_subtitle_folder` 表中新增 `scan_depth` 字段，在 `t_subtitle_mapping` 表中新增 `subtitle_relative_path` 字段：

```js
exports.up = function (knex) {
  return knex.schema
    .createTable('t_subtitle_folder', (table) => {
      table.increments()
      table.string('name')
      table.string('path').notNullable().unique()
      table.integer('scan_depth').notNullable().defaultTo(3)
    })
    .createTable('t_subtitle_mapping', (table) => {
      table.increments()
      table.string('work_id').notNullable()
      table.string('audio_filename').nullable()
      table.string('subtitle_filename').notNullable()
      table.string('subtitle_relative_path').notNullable().defaultTo('')
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

- [ ] **步骤 2：删除旧表并重启后端验证迁移**

由于功能尚未上线，直接删除旧表重启后端即可：

运行：`cd d:\work\kikoeru\apps\backend && node -e "const {knex}=require('./database/db'); knex.schema.dropTableIfExists('t_subtitle_mapping').dropTableIfExists('t_subtitle_folder').then(()=>{console.log('Tables dropped'); knex.destroy()})"`

然后重启后端服务，确认迁移执行成功。

- [ ] **步骤 3：验证表结构**

运行：`cd d:\work\kikoeru\apps\backend && node -e "const {knex}=require('./database/db'); knex.raw('PRAGMA table_info(t_subtitle_folder)').then(r=>console.log('folder:', r)).then(()=>knex.raw('PRAGMA table_info(t_subtitle_mapping)')).then(r=>console.log('mapping:', r)).then(()=>knex.destroy())"`

预期：`t_subtitle_folder` 包含 `scan_depth` 列，`t_subtitle_mapping` 包含 `subtitle_relative_path` 列

- [ ] **步骤 4：Commit**

```bash
git add apps/backend/database/migrations/20260619000000_subtitle_tables.js
git commit -m "feat(subtitle): add subtitle_relative_path and scan_depth fields to migration"
```

---

## 任务 2：扫描器递归扫描

**文件：**
- 修改：`apps/backend/filesystem/subtitleScanner.js`

- [ ] **步骤 1：添加递归扫描函数**

在文件顶部（`stripPrefix` 函数之后）添加 `walkSubtitleFiles` 函数：

```js
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
```

- [ ] **步骤 2：修改扫描主循环，使用递归扫描并读取 scan_depth**

将扫描主循环中读取子目录字幕文件的逻辑替换。找到以下代码块：

```js
        let subEntries
        try {
          subEntries = fs.readdirSync(fullWorkPath, { withFileTypes: true })
        } catch (_) {
          continue
        }

        const subtitleFiles = subEntries
          .filter(e => e.isFile() && SUBTITLE_EXTENSIONS.has(path.extname(e.name).toLowerCase()))
          .map(e => e.name)

        if (subtitleFiles.length === 0) continue
```

替换为：

```js
        const subtitleFiles = walkSubtitleFiles(fullWorkPath, 1, folder.scan_depth || 3)

        if (subtitleFiles.length === 0) continue
```

- [ ] **步骤 3：修改匹配逻辑，传入文件名列表而非纯文件名**

找到匹配循环：

```js
        if (audioFiles.length > 0) {
          for (const audioFile of audioFiles) {
            const matches = matchSubtitles(audioFile, subtitleFiles)
            for (const m of matches) {
              const row = {
                work_id: workId,
                audio_filename: audioFile,
                subtitle_filename: m.subtitleFilename,
                subtitle_folder_id: folder.id,
                subtitle_type: m.subtitleType,
                confidence: m.confidence
              }
              await knex('t_subtitle_mapping').insert(row)
              added++
            }
          }
        } else {
          for (const sf of subtitleFiles) {
            const ext = path.extname(sf).toLowerCase()
            const row = {
              work_id: workId,
              audio_filename: null,
              subtitle_filename: sf,
              subtitle_folder_id: folder.id,
              subtitle_type: ext === '.lrc' ? 'lrc' : 'vtt',
              confidence: 1.0
            }
            await knex('t_subtitle_mapping').insert(row)
            added++
          }
        }
```

替换为：

```js
        const subtitleFilenames = subtitleFiles.map(s => s.filename)

        if (audioFiles.length > 0) {
          for (const audioFile of audioFiles) {
            const matches = matchSubtitles(audioFile, subtitleFilenames)
            for (const m of matches) {
              const sf = subtitleFiles.find(s => s.filename === m.subtitleFilename)
              const row = {
                work_id: workId,
                audio_filename: audioFile,
                subtitle_filename: m.subtitleFilename,
                subtitle_relative_path: sf ? sf.relativePath : '',
                subtitle_folder_id: folder.id,
                subtitle_type: m.subtitleType,
                confidence: m.confidence
              }
              await knex('t_subtitle_mapping').insert(row)
              added++
            }
          }
        } else {
          for (const sf of subtitleFiles) {
            const ext = path.extname(sf.filename).toLowerCase()
            const row = {
              work_id: workId,
              audio_filename: null,
              subtitle_filename: sf.filename,
              subtitle_relative_path: sf.relativePath,
              subtitle_folder_id: folder.id,
              subtitle_type: ext === '.lrc' ? 'lrc' : 'vtt',
              confidence: 1.0
            }
            await knex('t_subtitle_mapping').insert(row)
            added++
          }
        }
```

- [ ] **步骤 4：Commit**

```bash
git add apps/backend/filesystem/subtitleScanner.js
git commit -m "feat(subtitle): recursive subtitle scanning with configurable depth"
```

---

## 任务 3：路由——读取路径拼接 + 递归懒匹配 + PATCH 路由

**文件：**
- 修改：`apps/backend/routes/subtitle.js`

- [ ] **步骤 1：添加递归扫描辅助函数**

在 `findWorkDirInFolder` 函数之后添加：

```js
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
```

- [ ] **步骤 2：修改 findSubtitlesInWorkDir 使用递归扫描**

将 `findSubtitlesInWorkDir` 函数替换为：

```js
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
```

- [ ] **步骤 3：修改 findSubtitlesInLibrary 使用递归扫描**

将 `findSubtitlesInLibrary` 函数替换为：

```js
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
```

- [ ] **步骤 4：修改 performLazyMatch 存储 subtitle_relative_path**

在 `performLazyMatch` 函数中，修改写入 mapping 的 rows 构造：

找到：
```js
  const rows = allResults.map(r => ({
    work_id: workId,
    audio_filename: audioFilename,
    subtitle_filename: r.subtitleFilename,
    subtitle_folder_id: r.subtitle_folder_id,
    subtitle_type: r.subtitleType,
    confidence: r.confidence
  }))
```

替换为：
```js
  const rows = allResults.map(r => ({
    work_id: workId,
    audio_filename: audioFilename,
    subtitle_filename: r.subtitleFilename,
    subtitle_relative_path: r.subtitle_relative_path || '',
    subtitle_folder_id: r.subtitle_folder_id,
    subtitle_type: r.subtitleType,
    confidence: r.confidence
  }))
```

同时修改返回的 mappings 映射，新增 `subtitleRelativePath` 字段。找到两处 `mappings: existing.map(...)` 和 `mappings: inserted.map(...)`：

```js
      mappings: existing.map(e => ({
        id: e.id,
        subtitleFilename: e.subtitle_filename,
        subtitleType: e.subtitle_type,
        confidence: e.confidence,
        source: e.subtitle_folder_id === null ? 'local' : 'library'
      })),
```

替换为：

```js
      mappings: existing.map(e => ({
        id: e.id,
        subtitleFilename: e.subtitle_filename,
        subtitleType: e.subtitle_type,
        confidence: e.confidence,
        source: e.subtitle_folder_id === null ? 'local' : 'library',
        subtitleRelativePath: e.subtitle_relative_path || ''
      })),
```

第二处 `inserted.map` 同样添加 `subtitleRelativePath: e.subtitle_relative_path || ''`。

- [ ] **步骤 5：修改 GET /file/:id 路由，拼接 relative_path 读取文件**

找到文件读取逻辑中的两处 `filePath` 拼接：

本地字幕（`subtitle_folder_id === null`）：
```js
        filePath = path.join(rootFolder.path, work.dir, mapping.subtitle_filename)
```
替换为：
```js
        const localParts = [rootFolder.path, work.dir]
        if (mapping.subtitle_relative_path) localParts.push(mapping.subtitle_relative_path)
        localParts.push(mapping.subtitle_filename)
        filePath = path.join(...localParts)
```

字幕库（`subtitle_folder_id !== null`）：
```js
        filePath = path.join(workDir, mapping.subtitle_filename)
```
替换为：
```js
        const libParts = [workDir]
        if (mapping.subtitle_relative_path) libParts.push(mapping.subtitle_relative_path)
        libParts.push(mapping.subtitle_filename)
        filePath = path.join(...libParts)
```

- [ ] **步骤 6：新增 PATCH /folders/:id 路由**

在 `router.delete('/folders/:id', ...)` 之后添加：

```js
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
```

- [ ] **步骤 7：Commit**

```bash
git add apps/backend/routes/subtitle.js
git commit -m "feat(subtitle): recursive scan in routes, relative_path in file serving, PATCH scan_depth"
```

---

## 任务 4：前端类型和 UI 更新

**文件：**
- 修改：`apps/frontend/src/types/subtitle.ts`
- 修改：`apps/frontend/src/pages/Dashboard/Advanced.vue`

- [ ] **步骤 1：更新 SubtitleFolder 类型**

在 `apps/frontend/src/types/subtitle.ts` 中，修改 `SubtitleFolder` 类型：

```ts
export type SubtitleFolder = {
  id: number
  name: string | null
  path: string
  scan_depth: number
}
```

- [ ] **步骤 2：在 Advanced.vue 字幕目录列表中添加扫描深度设置**

找到字幕目录列表的 `q-item`：

```html
        <q-item v-for="folder in subtitleFolders" :key="folder.id">
          <q-item-section>
            <q-item-label>{{ folder.name || folder.path }}</q-item-label>
            <q-item-label caption v-if="folder.name">{{ folder.path }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              round
              dense
              icon="delete"
              color="red"
              @click="removeSubtitleFolder(folder.id)"
            />
          </q-item-section>
        </q-item>
```

替换为：

```html
        <q-item v-for="folder in subtitleFolders" :key="folder.id">
          <q-item-section>
            <q-item-label>{{ folder.name || folder.path }}</q-item-label>
            <q-item-label caption v-if="folder.name">{{ folder.path }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row items-center q-gutter-xs">
              <q-input
                dense
                outlined
                v-model.number="folder.scan_depth"
                type="number"
                min="1"
                max="10"
                label="深度"
                style="width: 70px"
                @blur="updateScanDepth(folder.id, folder.scan_depth)"
              />
              <q-btn
                flat
                round
                dense
                icon="delete"
                color="red"
                @click="removeSubtitleFolder(folder.id)"
              />
            </div>
          </q-item-section>
        </q-item>
```

- [ ] **步骤 3：添加 updateScanDepth 方法**

在 `removeSubtitleFolder` 方法之后添加：

```ts
const updateScanDepth = async (id: number, depth: number) => {
  const clamped = Math.max(1, Math.min(10, Math.round(depth || 3)))
  try {
    await api.patch(`/api/subtitle/folders/${id}`, { scan_depth: clamped })
  } catch {
    showErrNotif('更新扫描深度失败')
  }
};
```

- [ ] **步骤 4：Commit**

```bash
git add apps/frontend/src/types/subtitle.ts apps/frontend/src/pages/Dashboard/Advanced.vue
git commit -m "feat(subtitle): add scan_depth UI in subtitle folder settings"
```