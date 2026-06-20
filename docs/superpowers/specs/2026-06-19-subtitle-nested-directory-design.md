# 字幕嵌套目录支持 设计

## 背景

当前字幕扫描器只读取 `字幕目录/RJCode/` 下的顶层文件，实际字幕文件夹可能嵌套多层子目录。需要支持递归扫描，并允许用户配置扫描深度。

## 数据库变更

### `t_subtitle_mapping` 新增字段

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `subtitle_relative_path` | TEXT | NOT NULL DEFAULT '' | 相对于 RJ/VJ Code 目录的子目录路径，顶层为空字符串 |

示例数据：

| subtitle_filename | subtitle_relative_path | 实际文件位置 |
|-------------------|----------------------|-------------|
| `01.lrc` | `""` | `字幕目录/RJ01386399/01.lrc` |
| `02.lrc` | `"特典"` | `字幕目录/RJ01386399/特典/02.lrc` |
| `03.lrc` | `"特典/子"` | `字幕目录/RJ01386399/特典/子/03.lrc` |

### `t_subtitle_folder` 新增字段

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `scan_depth` | INTEGER | NOT NULL DEFAULT 3 | 扫描深度，1-10，默认3 |

### 迁移策略

由于功能尚未上线，直接修改现有迁移文件 `20260619000000_subtitle_tables.js`，添加新字段。已有数据不受影响（DEFAULT 值兼容）。

## 扫描器变更

### 递归扫描函数

替换当前的单层 `fs.readdirSync`，改为递归遍历：

```js
const walkSubtitleFiles = (dir, depth, maxDepth) => {
  const results = []
  if (depth > maxDepth) return results
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isFile() && SUBTITLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push({ filename: entry.name, relativePath: '' })
    } else if (entry.isDirectory() && depth < maxDepth) {
      const subResults = walkSubtitleFiles(path.join(dir, entry.name), depth + 1, maxDepth)
      for (const r of subResults) {
        r.relativePath = r.relativePath ? `${entry.name}/${r.relativePath}` : entry.name
      }
      results.push(...subResults)
    }
  }
  return results
}
```

### 扫描流程

1. 读取 `t_subtitle_folder`，获取每个目录的 `scan_depth`
2. 对每个 RJ/VJ Code 目录调用 `walkSubtitleFiles(workDir, 1, folder.scan_depth)`
3. 返回 `{ filename, relativePath }` 列表
4. 匹配时 `subtitle_filename` 存纯文件名，`subtitle_relative_path` 存子目录路径

### 去重逻辑

扫描前删除该 `work_id + subtitle_folder_id` 下的旧 mapping，重新插入。需要把 `subtitle_relative_path` 纳入去重判断。

## 路由变更

### 读取字幕文件（GET /subtitle/file/:id）

拼接路径逻辑改为：

```
if (subtitle_folder_id === null) {
  // 本地字幕：音声库目录/RJCode/relative_path/filename
  filePath = path.join(rootFolder.path, work.dir, mapping.subtitle_relative_path, mapping.subtitle_filename)
} else {
  // 字幕库：字幕目录/RJCode/relative_path/filename
  filePath = path.join(workDir, mapping.subtitle_relative_path, mapping.subtitle_filename)
}
```

### 懒匹配（performLazyMatch）

`findSubtitlesInLibrary` 函数也需要改为递归扫描，返回结果包含 `relativePath`。写入 mapping 时一并存储。

`findSubtitlesInWorkDir` 同理，音声库目录下的字幕也可能在子目录中。

### 字幕目录 API

- `GET /folders` — 返回结果新增 `scan_depth` 字段
- `POST /folders` — 请求体支持 `scan_depth` 参数
- `PATCH /folders/:id` — 新增，用于更新 `scan_depth`

## 前端变更

### Advanced 页面

字幕目录列表中，每个目录增加扫描深度设置：
- 数字输入框，范围 1-10，默认 3
- 修改后调用 `PATCH /subtitle/folders/:id` 保存

## 影响范围

| 文件 | 变更类型 |
|------|---------|
| `apps/backend/database/migrations/20260619000000_subtitle_tables.js` | 修改：新增两个字段 |
| `apps/backend/filesystem/subtitleScanner.js` | 修改：递归扫描 + 读取 scan_depth |
| `apps/backend/routes/subtitle.js` | 修改：读取路径拼接 + 递归懒匹配 + PATCH 路由 |
| `apps/frontend/src/pages/Dashboard/Advanced.vue` | 修改：扫描深度 UI |