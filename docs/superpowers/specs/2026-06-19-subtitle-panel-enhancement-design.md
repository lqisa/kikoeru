# 字幕面板增强设计

## 1. 清理旧 LRC 逻辑

删除旧的 LyricsBar + check-lrc 链路，保留新的 SubtitlePanel + subtitle/mapping 链路。

| 操作 | 文件 | 内容 |
|------|------|------|
| 删除文件 | `components/LyricsBar.vue` | 整个文件 |
| 修改 | `layouts/MainLayout.vue` | 移除 LyricsBar import 和 `<LyricsBar />` |
| 修改 | `components/AudioElement.vue` | 移除 lrc-file-parser 相关：`lrcObj`、`lrcAvailable`、`initLrcObj`、`loadLrcFile`、`playLrc`、相关 watch 和 import |
| 修改 | `stores/audioPlayer/state.ts` | 移除 `currentLyric` 字段 |
| 修改 | `stores/audioPlayer/actions.ts` | 移除 `SET_CURRENT_LYRIC` action |
| 修改 | `types/api.ts` | 移除 `LrcCheckResponse` 类型 |
| 修改 | `types/index.ts` | 移除 `LrcCheckResponse` 导出 |
| 修改 | `backend/routes/media.js` | 移除 `/check-lrc/:id/:index` 路由 |

## 2. SubtitlePanel 桌面端增强

### Store 新增

**subtitle store state：**
- `autoScroll: boolean`（默认 true）
- `fontSize: number`（默认 14）
- `seekBeforeJump: number | null`（跳转前播放位置）

**audioPlayer store action：**
- `SEEK_TO(seconds: number)` — 记录当前位置到 subtitle store 的 `seekBeforeJump`，然后执行 seek

### Header 布局

`[字幕图标▼] [文件名] [撤销] [...▼] [关闭]`

- **撤销按钮**：仅当 `seekBeforeJump !== null` 时显示，点击恢复跳转前位置，3秒后自动隐藏
- **`...` 菜单**：自动滚动 Toggle + 字号滑块（12-40px，实时生效，显示当前值）

### 字幕行点击

点击字幕行 → `audioPlayer.SEEK_TO(cue.startTime)` → 撤销按钮出现

### 拖拽调整尺寸

右下角 resize handle，最小 280×200，最大宽度 95% 屏幕宽，最大高度 600px

## 3. 移动端适配

判断方式：`$q.screen.lt.sm`

### 移动端布局

```
┌──────────────────────────────────────┐
│ [▼最小化] [字幕开关] [撤销] [切换▼]  [⋮菜单] │
│                                      │
│        封面图 + 半透明字幕             │
│                                      │
└──────────────────────────────────────┘
```

### 移动端变化

- SubtitlePanel 不再是浮动窗口，叠在封面区域上方（半透明背景）
- AudioPlayer `...` 菜单中的字幕开关**隐藏**（移动端）
- 左上角最小化按钮旁新增：字幕开关、撤销、字幕切换按钮
- 自动滚动开关 + 字号滑块整合入播放器 `...` 菜单
- 按钮行上下留 padding 避免遮挡字幕内容
- 移动端不需要拖拽和 resize