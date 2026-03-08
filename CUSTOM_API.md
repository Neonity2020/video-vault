# 自定义 API 配置功能说明

Video Vault 现已支持多种 AI 服务商和完全自定义的 API 配置。

## 支持的服务商

### 1. ✨ Google Gemini（推荐·免费）
- **优点**: 完全免费、速度快、支持长文本
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta`
- **推荐模型**:
  - `gemini-2.5-flash` - 快速响应
  - `gemini-2.5-pro` - 高质量输出
- **获取 API Key**: 前往 [Google AI Studio](https://aistudio.google.com/apikey)

### 2. 🤖 OpenAI
- **优点**: 业界标准、模型强大
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **推荐模型**:
  - `gpt-4o-mini` - 性价比高
  - `gpt-4o` - 性能最强
- **获取 API Key**: 前往 [OpenAI Platform](https://platform.openai.com/api-keys)

### 3. 🔍 DeepSeek
- **优点**: 高性价比、中文优化
- **Endpoint**: `https://api.deepseek.com/chat/completions`
- **推荐模型**:
  - `deepseek-chat` - 通用对话
  - `deepseek-reasoner` - 深度推理
- **获取 API Key**: 前往 [DeepSeek Platform](https://platform.deepseek.com/api_keys)

### 4. 🧠 Anthropic Claude
- **优点**: 强大的推理能力
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **推荐模型**:
  - `claude-3-5-sonnet-20241022` - 均衡性能
  - `claude-3-5-sonnet-20250114` - 最新版本
- **获取 API Key**: 前往 [Anthropic Console](https://console.anthropic.com/settings/keys)

### 5. 🌐 OpenRouter
- **优点**: 统一访问多种模型
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **推荐模型**:
  - `anthropic/claude-3.5-sonnet`
  - `openai/gpt-4o-mini`
  - 等多种模型
- **获取 API Key**: 前往 [OpenRouter Keys](https://openrouter.ai/keys)

### 6. ⚙️ 自定义
- 完全自定义配置
- 支持任何兼容 OpenAI 格式的 API
- 自行填写 Endpoint、API Key 和模型名称

## 使用方法

### 基本步骤

1. 打开 Video Vault 应用
2. 点击侧边栏的"设置"按钮
3. 在"AI API 配置"部分选择服务商
4. 填写 API Key
5. （可选）修改 Endpoint 和模型名称
6. 点击"保存设置"

### 自定义配置

如果选择预设服务商后仍需要自定义：

1. 选择任意预设（如 OpenAI 兼容）
2. 修改"API Endpoint"字段
3. 修改"模型名称"字段
4. 填写对应的 API Key
5. 保存设置

或者直接选择"自定义"选项，完全自由配置。

## 配置示例

### 示例 1: 使用 Gemini（推荐）

```
服务商: ✨ Google Gemini（推荐·免费）
API Endpoint: https://generativelanguage.googleapis.com/v1beta
API Key: AIzaSy...
模型: gemini-2.5-flash
```

### 示例 2: 使用 DeepSeek

```
服务商: 🔍 DeepSeek
API Endpoint: https://api.deepseek.com/chat/completions
API Key: sk-...
模型: deepseek-chat
```

### 示例 3: 自定义本地 API

```
服务商: ⚙️ 自定义
API Endpoint: http://localhost:11434/v1/chat/completions
API Key: (可留空)
模型: llama2
```

### 示例 4: 使用代理服务

```
服务商: 🤖 OpenAI
API Endpoint: https://your-proxy.com/v1/chat/completions
API Key: sk-...
模型: gpt-4o-mini
```

## 常见问题

### Q: API Key 安全吗？
A: 所有 API Key 都加密存储在本地，不会上传到任何服务器。

### Q: 如何切换服务商？
A: 在设置中选择新的服务商，填写对应的 API Key，保存即可。

### Q: 可以使用免费服务吗？
A: 可以，推荐使用 Google Gemini，完全免费且性能优秀。

### Q: 自定义 API 的格式是什么？
A: 只要兼容 OpenAI API 格式即可，大部分 AI 服务都支持。

### Q: 如何获取 API Key？
A: 每个服务商都有对应的获取链接，在设置界面点击"获取 Key"即可跳转。

### Q: API 调用失败怎么办？
A: 检查以下几点：
1. API Key 是否正确
2. API 额度是否充足
3. Endpoint 是否正确
4. 模型名称是否正确
5. 网络连接是否正常

### Q: 支持本地模型吗？
A: 支持，使用"自定义"选项，填写本地 API 的 Endpoint 即可。

## 技术说明

- 所有 API 调用都通过 OpenAI 兼容的格式
- 支持流式和非流式响应
- 自动处理错误和重试
- 支持长文本处理

## 更新日志

### v1.1.0 (2025-03-08)
- ✨ 新增 DeepSeek 支持
- ✨ 新增 Anthropic Claude 支持
- ✨ 新增 OpenRouter 支持
- ✨ 新增自定义配置选项
- 🎨 优化设置界面 UI
- 🔒 添加 API Key 显示/隐藏功能
- 📝 改进配置说明文档
