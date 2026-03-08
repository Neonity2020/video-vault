# Video Vault Landing Page

这是 Video Vault 项目的官方 Landing Page，使用 Astro 框架构建。

## 功能特性

- 现代化的响应式设计
- 快速加载和优秀的 SEO
- 纯静态站点，易于部署
- 支持暗色/亮色主题切换（可选）

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

开发服务器将在 [http://localhost:4321/](http://localhost:4321/) 启动。

## 部署

### 部署到 GitHub Pages

1. 在 `astro.config.mjs` 中配置：
```js
export default defineConfig({
  site: 'https://yourusername.github.io',
  base: '/video-vault',
  // ... 其他配置
});
```

2. 构建站点：
```bash
npm run build
```

3. 将 `dist` 目录推送到 GitHub Pages 分支

### 部署到 Netlify

1. 将此仓库连接到 Netlify
2. 设置构建命令为 `npm run build`
3. 设置发布目录为 `dist`

### 部署到 Vercel

1. 将此仓库连接到 Vercel
2. Vercel 会自动检测 Astro 并配置正确的构建设置

## 自定义

### 修改链接

在 [src/pages/index.astro](src/pages/index.astro) 中更新以下内容：
- GitHub 仓库链接：将 `yourusername` 替换为你的 GitHub 用户名
- 下载链接：更新为实际的发布页面链接

### 修改样式

所有样式都在各自的组件文件中定义，使用了 CSS 变量，可以轻松自定义主题色。

### 添加新页面

在 `src/pages/` 目录下创建新的 `.astro` 文件即可。

## 技术栈

- **Astro** - 现代化的静态站点生成器
- **纯 CSS** - 无需额外框架，轻量高效
- **TypeScript** - 类型安全

## 许可证

MIT
