# Video Vault Landing Page 部署指南

本指南将帮助你将 Video Vault Landing Page 部署到各种静态网站托管平台。

## 前提条件

- 已安装 Node.js (v18 或更高版本)
- Git 账户

## 本地开发

1. 克隆仓库：
```bash
git clone https://github.com/yourusername/video-vault.git
cd video-vault/landing-page
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

4. 在浏览器中打开 [http://localhost:4321/](http://localhost:4321/)

## 构建生产版本

```bash
npm run build
```

构建产物将在 `dist/` 目录中。

## 部署选项

### 1. GitHub Pages

#### 方法一：使用 GitHub Actions

1. 在 landing-page 目录创建 `.github/workflows/deploy.yml`：
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: landing-page/package-lock.json
      - name: Install and Build
        working-directory: ./landing-page
        run: |
          npm ci
          npm run build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./landing-page/dist
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

2. 在 GitHub 仓库设置中：
   - 进入 Settings > Pages
   - 在 "Build and deployment" 下，选择 Source 为 "GitHub Actions"

3. 推送代码到 main 分支，将自动部署

#### 方法二：手动部署

1. 更新 `astro.config.mjs`：
```js
import { defineConfig } from 'astro/config'

export default defineConfig({
  site: 'https://yourusername.github.io',
  base: '/video-vault',
})
```

2. 构建并推送到 gh-pages 分支：
```bash
npm run build
npx gh-pages -d dist
```

### 2. Netlify

#### 方法一：通过 Netlify 网站

1. 登录 [Netlify](https://netlify.com)
2. 点击 "New site from Git"
3. 选择你的 Git 仓库
4. 配置构建设置：
   - Build command: `npm run build` (在 landing-page 目录下)
   - Publish directory: `landing-page/dist`
5. 点击 "Deploy site"

#### 方法二：使用 Netlify CLI

1. 安装 Netlify CLI：
```bash
npm install -g netlify-cli
```

2. 登录 Netlify：
```bash
netlify login
```

3. 初始化站点：
```bash
cd landing-page
netlify init
```

4. 部署：
```bash
netlify deploy --prod
```

### 3. Vercel

1. 安装 Vercel CLI：
```bash
npm install -g vercel
```

2. 在 landing-page 目录下运行：
```bash
vercel
```

3. 按照提示完成部署

### 4. Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 Pages > Create a project
3. 选择 "Connect to Git"
4. 配置构建设置：
   - Build command: `cd landing-page && npm run build`
   - Build output directory: `landing-page/dist`
5. 点击 "Save and Deploy"

## 自定义域名

无论选择哪个托管平台，都可以在设置中配置自定义域名：

1. 在域名注册商处添加 CNAME 记录
2. 在托管平台的设置中添加自定义域名
3. 等待 DNS 传播完成

## 环境变量

如果需要使用环境变量（如 API 密钥），可以在各个平台的设置中添加：

- GitHub Pages: Settings > Secrets and variables > Actions
- Netlify: Site settings > Environment variables
- Vercel: Settings > Environment Variables
- Cloudflare Pages: Settings > Environment variables

## 更新网站

1. 修改代码
2. 推送到 Git 仓库
3. 各平台会自动重新部署（如果配置了自动部署）

或手动触发部署：
- GitHub Pages: 在 Actions 页面手动运行 workflow
- Netlify/Vercel: 在控制台手动部署

## 性能优化

本站已经进行了以下优化：
- 静态生成，无需服务器端渲染
- 最小化的 CSS 和 JavaScript
- 图片优化（如需添加图片，建议使用 WebP 格式）
- 缓存策略已优化

## 监控和分析

建议添加以下服务：
- Google Analytics - 访客分析
- Google Search Console - SEO 监控
- Cloudflare Analytics - 性能监控

## 问题排查

### 构建失败
- 检查 Node.js 版本是否符合要求
- 确保 `package.json` 中的脚本正确
- 查看构建日志获取详细错误信息

### 部署后页面无法访问
- 检查 DNS 设置
- 确认构建输出目录配置正确
- 查看托管平台的部署日志

### 样式或资源加载失败
- 检查 `base` 路径配置是否正确
- 确认所有资源路径都是相对路径
- 检查浏览器控制台是否有错误信息

## 需要帮助？

- 提交 Issue: [GitHub Issues](https://github.com/yourusername/video-vault/issues)
- 查看 Astro 文档: [https://docs.astro.build](https://docs.astro.build)
