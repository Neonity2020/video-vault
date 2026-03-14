# Video Vault

<div align="center">
  <h3>🎬 智能视频管理与笔记系统</h3>
  <p>基于 Tauri + React + TypeScript 开发的桌面应用</p>
</div>

## ✨ 主要功能

### 📹 视频管理
- 支持从 YouTube 和 Bilibili 导入视频
- 自动获取视频信息（标题、描述、封面）
- 本地数据库存储，快速检索
- 视频预览和播放
- 回收站功能，误删可恢复

### 🤖 AI 智能功能
- **智能标签生成**: AI 自动分析视频内容，生成精准标签
- **时间戳翻译**: AI 翻译视频时间戳为英文
- **描述翻译**: 视频描述多语言翻译
- **多服务商支持**:
  - ✨ Google Gemini (推荐·免费)
  - 🤖 OpenAI
  - 🔍 DeepSeek
  - 🧠 Anthropic Claude
  - 🌐 OpenRouter
  - ⚙️ 自定义 API

### 📝 笔记系统
- 手动输入逐字稿和时间戳
- 生成 Obsidian 兼容的 Markdown 笔记
- 支持数学公式 (KaTeX)
- 一键导出到 Obsidian

### 🎨 界面特点
- 现代化响应式设计
- 流畅的动画效果
- 登录页面引导
- 直观的操作流程

## 🚀 快速开始

### 环境要求

- Node.js 18+
- Rust (用于 Tauri)
- pnpm (推荐) 或 npm

### 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install
```

### 开发模式

```bash
# 启动开发服务器
pnpm tauri dev
```

### 构建应用

```bash
# 构建生产版本
pnpm tauri build
```

## 📖 使用指南

### 添加视频

1. 点击"添加视频"按钮
2. 粘贴 YouTube 或 Bilibili 链接
3. 点击"获取信息"自动填充视频信息
4. (可选) 点击"AI 生成标签"智能生成标签
5. 点击"保存"

### AI 配置

1. 打开设置页面
2. 选择 AI 服务商
3. 填写 API Key
4. (可选) 自定义 Endpoint 和模型
5. 保存设置

> 💡 推荐使用 Google Gemini，完全免费且性能优秀

### 生成 Obsidian 笔记

1. 编辑视频，添加逐字稿和时间戳
2. 点击"生成 Obsidian 笔记"
3. 复制生成的 Markdown 内容
4. 粘贴到 Obsidian 中

## 🔧 技术栈

### 前端
- **框架**: React 19
- **语言**: TypeScript
- **构建工具**: Vite
- **UI**: 自定义组件 + Tailwind CSS

### 后端
- **框架**: Tauri 2
- **语言**: Rust
- **数据库**: SQLite (via @tauri-apps/plugin-sql)

### AI 集成
- OpenAI 兼容 API
- 流式响应支持
- 多服务商适配

### 视频处理
- ytdl-core (视频信息获取)
- KaTeX (数学公式渲染)
- react-markdown (Markdown 渲染)

## 📁 项目结构

```
video-vault/
├── src/                    # 前端源代码
│   ├── components/        # React 组件
│   ├── pages/            # 页面组件
│   ├── hooks/            # 自定义 Hooks
│   └── utils/            # 工具函数
├── src-tauri/            # Tauri 后端
│   ├── src/              # Rust 源代码
│   │   ├── ai.rs         # AI 相关功能
│   │   ├── db.rs         # 数据库操作
│   │   └── video.rs      # 视频处理
│   └── tauri.conf.json   # Tauri 配置
├── public/               # 静态资源
├── landing-page/         # 登录页面
└── docs/                # 文档
```

## 📝 更新日志

### v1.0.1 (2025-03-14)
- ✨ 新增视频描述翻译功能
- 🗑️ 修复回收站功能
- 🎨 更新登录页面设计
- 🔧 修复 SQL 索引不匹配问题

### v1.0.0 (2025-03-08)
- ✨ 新增 Obsidian 兼容笔记系统
- 🤖 新增 AI 智能标签生成
- 🌐 新增多 AI 服务商支持
- 📝 支持手动输入逐字稿和时间戳
- 🎨 新增应用图标
- 🌍 新增 AI 时间戳翻译
- 🎬 支持 Bilibili 视频导入
- 🖼️ 修复 Bilibili 封面图获取
- 📱 优化模态框滚动体验

## 🛠️ 开发工具推荐

- [VS Code](https://code.visualstudio.com/)
- [Tauri VS Code 扩展](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请提交 [Issue](https://github.com/yourusername/video-vault/issues)

---

<div align="center">
  <p>用 ❤️ 和 Tauri 构建</p>
</div>