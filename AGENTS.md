# Kikoeru AI 编码指令

本文件为 AI 助手提供关于 `kikoeru` 项目的完整开发上下文和准则。

## 项目概述
`kikoeru` 是一个专为 DLsite 同人音声（ASMR/广播剧）设计的自托管媒体服务器项目，目前采用前后端分离架构，已合并到单一仓库中。

- **后端** (`apps/backend/`): 基于 Express.js 的媒体服务器，负责索引本地音频文件、提供 API 接口和实时通信
- **前端** (`apps/frontend/`): 基于 Quasar 2.x + Vue 3 + TypeScript 的 Web 界面，提供用户交互和媒体播放功能

## 项目架构
```
kikoeru/
├── apps/
│   ├── backend/           # Express 后端服务器 (原 kikoeru-express)
│   └── frontend/          # Quasar 前端应用 (原 kikoeru-quasar)
├── .trae/                 # Trae IDE 配置和技能
└── package.json           # 根项目配置
```

## 后端技术栈
- **运行时**: Node.js (>= 20.0.0)
- **框架**: Express.js
- **数据库**: SQLite3 (通过 Knex.js 管理)
- **数据库迁移**: Umzug 和 Knex-migrate
- **身份验证**: JWT (JSON Web Tokens)
- **实时通讯**: Socket.io
- **打包工具**: `pkg` (用于生成独立的可执行文件)

## 前端技术栈
- **框架**: Quasar 2.x (基于 Vue 3)
- **语言**: TypeScript
- **状态管理**: Pinia (已从 Vuex 迁移)
- **路由**: Vue Router 4.x
- **构建工具**: Vite (通过 @quasar/app-vite)
- **UI 组件**: Quasar Components
- **其他**: 
  - Axios (HTTP 请求)
  - Socket.io-client (实时通信)
  - Web Audio API (音量增益放大，最高 200%)
  - QVirtualScroll (虚拟滚动优化长列表性能)
  - localStorage (字幕偏好和播放状态持久化)

## 后端项目结构
- `app.js`: 主入口文件和 Express 服务器配置
- `api.js`: 为 express 实例添加路由与 jwt 验证中间件
- `config.js`: 用于生成与修改 config.json 配置文件
- `/filesystem`: 包含媒体库扫描 (`scanner.js`)、更新 (`updater.js`)、字幕扫描 (`subtitleScanner.js`) 和字幕匹配 (`subtitleMatcher.js`) 的逻辑
- `/database`: 
  - `migrations/`: 数据库架构演变文件
  - `knexfile.js`: 数据库连接和配置
  - `storage.js`: 数据库访问层
- `/routes`: API 路由
  - `subtitle.js`: 字幕目录管理、字幕映射查询、字幕文件服务
  - `config.js`: 配置管理和目录浏览
  - `media.js`: 媒体文件流服务
  - `metadata.js`: DLsite 元数据
  - `review.js`: 评价系统
  - `auth.js`: 认证路由
  - `credentials.js`: 凭据管理
  - `version.js`: 版本信息
- `/auth`: 身份验证相关工具
- `/config`: 配置文件目录（被 nodemon 忽略）
- `/dist`: 编译后的前端资源
- `/static`: Express 托管的静态文件

## 前端项目结构
- `/src/boot`: 应用启动文件 (axios, socket.io, i18n 等)
- `/src/composables`: 组合式函数
  - `useApi.ts`: Axios 封装
  - `useSocket.ts`: Socket.io 封装
  - `useNotification.ts`: 通知工具
- `/src/components`: Vue 组件
  - `AudioPlayer.vue`: 音频播放器（含移动端/桌面端自适应布局）
  - `AudioElement.vue`: 音频元素（Web Audio API 增益控制）
  - `SubtitlePanel.vue`: 桌面端字幕面板（可拖拽、可调整尺寸、虚拟滚动）
  - `FolderBrowser.vue`: 目录浏览器（虚拟滚动）
  - `WorkCard.vue`: 作品卡片组件
  - `WorkDetails.vue`: 作品详情组件
  - `WorkTree.vue`: 作品文件树组件
  - `PlayerBar.vue`: 播放控制栏
  - `SleepMode.vue`: 睡眠定时器
  - `VideoPlayer.vue`: 视频播放器
- `/src/stores`: Pinia 状态管理 (TypeScript)
  - `audioPlayer/`: 音频播放器状态（播放队列、进度、播放状态持久化）
  - `subtitle/`: 字幕状态（字幕内容、可见性、自动滚动、字号、跳转位置）
  - `user/`: 用户状态
- `/src/types`: TypeScript 类型定义
  - `api.ts`, `audio.ts`, `subtitle.ts`, `work.ts`, `user.ts`, `socket.ts`
- `/src/utils`: 工具函数
  - `vttParser.ts`: VTT 和 LRC 格式解析
  - `audio.ts`: 音频工具
- `/src/layouts`: 页面布局
  - `MainLayout.vue`: 主布局（含响应式侧边栏，breakpoint 600px）
  - `DashboardLayout.vue`: 管理面板布局
- `/src/pages`: 页面组件
  - `Works.vue`: 作品列表页
  - `Work.vue`: 作品详情页（含音频播放状态恢复功能）
  - `List.vue`: 列表页（社团/标签/声优）
  - `Favourites.vue`: 收藏页面
  - `Login.vue`: 登录页面
  - `/Dashboard/`: 管理面板子页面
    - `Advanced.vue`: 高级设置（含字幕目录管理、扫描深度配置）
    - `Scanner.vue`: 扫描管理
    - `Folders.vue`: 文件夹管理
    - `UserManage.vue`: 用户管理
- `/src/router`: 路由配置 (TypeScript)
- `/src/i18n`: 国际化
- `quasar.config.ts`: Quasar 框架配置 (TypeScript)

## 关键脚本

### 后端 (`apps/backend/`)
- `npm start`: 使用 `app.js` 启动生产服务器
- `npm run dev`: 使用 `nodemon` 启动开发服务器
- `npm run scan`: 手动触发媒体库扫描
- `npm run build`: 使用 `pkg` 将应用打包为 Windows 可执行文件
- `npm run lint`: 运行 ESLint 并自动修复
- `npm test`: 运行 Mocha 测试

### 前端 (`apps/frontend/`)
- `npm start` 或 `quasar dev`: 启动开发服务器 (热重载)
- `npm run build` 或 `quasar build`: 构建 SPA 生产版本
- `quasar build -m pwa`: 构建 PWA 生产版本
- `npm run lint`: 运行 ESLint 检查
- `npm run typecheck`: 运行 vue-tsc 类型检查

## 开发环境配置

### 前端开发服务器代理
前端开发服务器配置了代理，将 API 请求转发到后端（配置在 `quasar.config.ts`）：
```javascript
// quasar.config.ts - devServer.proxy
proxy: {
  '/api': { target: 'http://localhost:8888', changeOrigin: true },
  '/socket.io': { target: 'http://localhost:8888', ws: true }
}
```

### 启动开发环境
1. 启动后端服务器: `cd apps/backend && npm run dev` (默认端口 8888)
2. 启动前端开发服务器: `cd apps/frontend && npm start` (默认端口 8080)

## 编码标准与指南

### 后端编码规范
1. **代码风格**
   - 遵循 **JavaScript Standard Style**
   - 使用 **Prettier** 进行代码格式化
   - 遵循 `.eslintrc.json` 中的配置

2. **后端逻辑**
   - 必要时使用 `bluebird` 处理高级 Promise 逻辑
   - 确保所有 API 路由都受到 `express-jwt` 保护，除非是公开资源
   - 使用 `express-validator` 验证请求体和参数

3. **数据库操作**
   - 必须使用 `knex` 构建 SQL 查询
   - 任何数据库表结构的更改必须通过 `/database/migrations/` 中的迁移文件实现
   - 使用 `umzug` 管理迁移的执行

4. **错误处理**
   - 使用 `invariant` 进行内部一致性检查
   - 遵循标准的 Express 错误处理中间件模式
   - 确保在开发环境中追踪警告 (`--trace-warnings`)

5. **文件系统**
   - 注意字符编码：项目使用 `jschardet` 检测文件编码
   - 在对文件列表排序时，使用 `natural-orderby` 以符合人类的排序习惯

### 前端编码规范
1. **代码风格**
   - 遵循 Vue 3 组合式 API 最佳实践
   - 使用 Quasar 组件库的规范
   - 遵循 `.eslintrc.json` 中的配置

2. **组件开发**
   - 优先使用 Quasar 内置组件
   - 遵循单一职责原则，保持组件简洁
   - 使用 Props 和 Emits 进行父子组件通信
   - 复杂状态管理使用 Pinia

3. **状态管理**
   - 使用 Pinia 进行状态管理（已从 Vuex 迁移）
   - 按功能模块组织 store (如 `audioPlayer/`, `subtitle/`, `user/`)
   - 每个 store 模块包含 `index.ts`, `state.ts`, `getters.ts`, `actions.ts`
   - 遵循 Pinia 的最佳实践

4. **路由**
   - 使用 Vue Router 4.x
   - 路由配置在 `src/router/routes.ts` (TypeScript)
   - 需要认证的路由设置 `meta: { auth: true }`

5. **API 通信**
   - 使用 Axios 进行 HTTP 请求
   - API 基础路径通过代理配置为 `/api`
   - 使用 Socket.io-client 进行实时通信

## AI 专用指令

### 通用原则
- **一致性**: 添加新功能时，请匹配现有模式
- **安全性**: 确保敏感操作经过身份验证和授权检查
- **文档**: 重要更改时提醒更新相关文档和版本号

### 后端开发注意事项
- **打包注意事项**: 项目会被打包成单个二进制文件，避免使用 `pkg` 无法解析的动态 `require` 路径
- **数据库迁移**: 任何数据库结构变更都必须通过迁移文件实现
- **实时通信**: 使用 Socket.io 进行实时功能开发（如扫描进度通知）

### 前端开发注意事项
- **TypeScript**: 项目已迁移到 TypeScript，所有新代码必须使用 TypeScript
- **响应式设计**: 确保界面在不同设备上都能正常显示，移动端/桌面端通过屏幕宽度判断
- **虚拟滚动**: 长列表（字幕、目录浏览）使用 QVirtualScroll 优化性能
- **性能优化**: 合理使用 Vue 的响应式特性，避免不必要的重渲染
- **用户体验**: 遵循 Quasar 的设计规范，保持界面一致性
- **持久化**: 字幕偏好（自动滚动、字号、窗口位置/尺寸）和播放状态使用 localStorage

### 常用上下文
- **目标用户**: 想要自行托管 DLsite 资源库的用户
- **核心元数据**: DLsite ID (RJ 号) 是识别和索引作品的核心标识符
- **主要功能**: 
  - 媒体库扫描和索引
  - 音频播放和进度管理（含播放状态持久化）
  - 字幕显示和管理（VTT/LRC 格式，支持嵌套目录扫描）
  - 作品收藏和评价
  - 标签和分类管理
  - 用户认证和权限管理

## 功能模块说明

### 后端主要功能
- 媒体库扫描和索引
- DLsite 元数据爬取
- 用户认证 (JWT)
- 文件服务和流媒体传输
- 实时进度通知 (Socket.io)
- 配置管理
- 字幕扫描和匹配（支持嵌套目录、扫描深度配置、LRC/VTT 格式）

### 前端主要功能
- 作品浏览和搜索
- 音频播放控制（Web Audio API 增益放大，最高 200%）
- 字幕显示（桌面端可拖拽面板、移动端封面叠加、虚拟滚动）
- 播放状态持久化（进入详情页提示恢复播放）
- 进度标记和收藏
- 用户评价和评论
- 管理面板（扫描、文件夹管理、字幕目录管理、用户管理）

## 开发工作流
1. 在 `apps/backend/` 中开发后端功能
2. 在 `apps/frontend/` 中开发前端界面
3. 前端通过代理访问后端 API (`/api`)
4. 使用 Socket.io 进行实时通信
5. 前端构建后部署到后端的 `dist/` 目录

## 测试和部署
- 后端使用 Mocha 进行单元测试
- 前端使用 ESLint 进行代码检查
- 后端可使用 `pkg` 打包为独立可执行文件
- 前端可构建为 SPA 或 PWA
- 支持 Docker 部署

## 当前状态
- 前端已迁移到 Quasar 2.x + Vue 3 + TypeScript
- 状态管理已从 Vuex 迁移到 Pinia
- 字幕功能已完成（后端扫描/匹配 + 前端面板/移动端适配）
- 音频播放器已重构（Web Audio API 增益、播放状态持久化）
- 后端保持原有架构，功能稳定

## 注意事项
- 前端开发时需要后端服务器运行在 `localhost:8888`
- 生产环境时，前端构建产物需要放在后端的 `dist/` 目录
- 数据库文件默认位于 `apps/backend/sqlite/` 目录
- 配置文件位于 `apps/backend/config/` 目录
- 数据库迁移通过 `knex_migrations` 表追踪，删除记录+删表后重启可重新执行迁移

## 字幕系统

### 数据库表
- `t_subtitle_folder`: 字幕目录配置（path, name, scan_depth）
- `t_subtitle_mapping`: 字幕映射（work_id → audio_filename → subtitle_filename，含 confidence、subtitle_type、subtitle_relative_path）

### 扫描流程
1. 遍历字幕目录下的子文件夹（RJ/VJ 号）
2. 从文件夹名提取数字 ID，查询 `t_work` 表确认作品存在
3. 递归扫描字幕文件（受 scan_depth 限制）
4. 使用 `subtitleMatcher.js` 将字幕与音频配对（轨道号提取 + Levenshtein 距离）
5. 扫描前先删除该作品在该目录下的旧映射，避免重复

### 前端字幕架构
- **桌面端**: SubtitlePanel.vue — 可拖拽、可调整尺寸的浮动面板，QVirtualScroll 虚拟滚动
- **移动端**: 字幕叠加在封面区域，控制按钮在播放器最小化按钮旁
- **偏好持久化**: localStorage 存储自动滚动、字号、桌面端窗口位置/尺寸
- **播放状态持久化**: localStorage 存储作品 ID + 音频标题 + 当前时间，每 10s 记录，进入详情页提示恢复