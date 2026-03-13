import { useState, useEffect } from 'react';
import { AppSettings } from '../types';

interface SettingsProps {
    settings: AppSettings;
    onSave: (settings: AppSettings) => void;
    saving: boolean;
}

const PROVIDER_PRESETS: Record<string, {
    label: string;
    endpoint: string;
    model: string;
    keyPlaceholder: string;
    keyUrl: string;
    description: string;
}> = {
    gemini: {
        label: '✨ Google Gemini（推荐·免费）',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-2.5-flash',
        keyPlaceholder: 'AIza...',
        keyUrl: 'https://aistudio.google.com/apikey',
        description: '免费快速，支持长文本',
    },
    openai: {
        label: '🤖 OpenAI',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        keyPlaceholder: 'sk-...',
        keyUrl: 'https://platform.openai.com/api-keys',
        description: '业界领先的 AI 模型',
    },
    deepseek: {
        label: '🔍 DeepSeek',
        endpoint: 'https://api.deepseek.com/chat/completions',
        model: 'deepseek-chat',
        keyPlaceholder: 'sk-...',
        keyUrl: 'https://platform.deepseek.com/api_keys',
        description: '高性价比中文模型',
    },
    anthropic: {
        label: '🧠 Anthropic Claude',
        endpoint: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20241022',
        keyPlaceholder: 'sk-ant-...',
        keyUrl: 'https://console.anthropic.com/settings/keys',
        description: '强大的推理能力',
    },
    openrouter: {
        label: '🌐 OpenRouter',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'anthropic/claude-3.5-sonnet',
        keyPlaceholder: 'sk-or-...',
        keyUrl: 'https://openrouter.ai/keys',
        description: '统一访问多种模型',
    },
    custom: {
        label: '⚙️ 自定义',
        endpoint: '',
        model: '',
        keyPlaceholder: '输入 API Key',
        keyUrl: '',
        description: '完全自定义配置',
    },
};

const codeStyle = { color: 'var(--text-accent)', background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: 4 };

export default function Settings({ settings, onSave, saving }: SettingsProps) {
    const [form, setForm] = useState<AppSettings>(settings);
    const [saved, setSaved] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => { setForm(settings); }, [settings]);

    const handleSave = async () => {
        try {
            await onSave(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch { }
    };

    const handleProviderChange = (provider: string) => {
        const preset = PROVIDER_PRESETS[provider];
        if (!preset) return;

        setForm({
            api_provider: provider as any,
            api_endpoint: preset.endpoint,
            api_key: provider === 'custom' ? '' : form.api_key, // Clear key for custom, keep for others
            model: preset.model,
        });
    };

    const preset = PROVIDER_PRESETS[form.api_provider] || PROVIDER_PRESETS.gemini;
    const isCustom = form.api_provider === 'custom';

    return (
        <div className="settings-page">
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
                <span style={{ marginRight: 8 }}>⚙️</span>设置
            </h2>

            <div className="settings-card">
                <h3>🤖 AI API 配置</h3>

                {/* Provider Selector */}
                <div className="form-group">
                    <label className="form-label">选择服务商</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        {Object.entries(PROVIDER_PRESETS).map(([key, provider]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleProviderChange(key)}
                                style={{
                                    padding: '14px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${form.api_provider === key ? 'var(--accent)' : 'var(--border-color)'}`,
                                    background: form.api_provider === key ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-glass)',
                                    color: form.api_provider === key ? 'var(--accent)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: form.api_provider === key ? 600 : 400,
                                    fontSize: 13,
                                    transition: 'all 200ms ease',
                                    textAlign: 'left',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4,
                                }}
                            >
                                <span>{provider.label}</span>
                                <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>
                                    {provider.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        API Endpoint
                        {!isCustom && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>
                                （可修改）
                            </span>
                        )}
                    </label>
                    <input
                        className="form-input"
                        type="url"
                        value={form.api_endpoint}
                        onChange={(e) => setForm({ ...form, api_endpoint: e.target.value })}
                        placeholder={isCustom ? 'https://api.example.com/v1/chat/completions' : preset.endpoint}
                    />
                    {!isCustom && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                            默认: <code style={codeStyle}>{preset.endpoint}</code>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">
                        API Key
                        {preset.keyUrl && (
                            <a href={preset.keyUrl} target="_blank" rel="noopener noreferrer"
                                style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                                获取 Key →
                            </a>
                        )}
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="form-input"
                            type={showApiKey ? 'text' : 'password'}
                            value={form.api_key}
                            onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                            placeholder={preset.keyPlaceholder}
                            style={{ paddingRight: 80 }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            style={{
                                position: 'absolute',
                                right: 8,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: 18,
                                color: 'var(--text-secondary)',
                            }}
                        >
                            {showApiKey ? '🙈' : '👁️'}
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        模型名称
                        {!isCustom && (
                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>
                                （可修改）
                            </span>
                        )}
                    </label>
                    <input
                        className="form-input"
                        type="text"
                        value={form.model}
                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                        placeholder={isCustom ? 'gpt-4o-mini' : preset.model}
                    />
                    {!isCustom && (
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)' }}>
                            默认: <code style={codeStyle}>{preset.model}</code>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.api_key}>
                        {saving ? '保存中...' : '💾 保存设置'}
                    </button>
                    {saved && <span className="save-indicator">✓ 已保存</span>}
                    {!form.api_key && (
                        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                            ⚠️ 请输入 API Key
                        </span>
                    )}
                </div>
            </div>

            <div className="settings-card">
                <h3>📖 配置说明</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>✨ Google Gemini（推荐）</p>
                    <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                        <li>完全免费，速度快，支持长文本</li>
                        <li>前往 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Google AI Studio</a> 获取 API Key</li>
                        <li>推荐模型: <code style={codeStyle}>gemini-2.5-flash</code>（快速）或 <code style={codeStyle}>gemini-2.5-pro</code>（高质量）</li>
                    </ul>

                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>🔍 DeepSeek</p>
                    <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                        <li>高性价比，中文优化</li>
                        <li>Endpoint: <code style={codeStyle}>https://api.deepseek.com/chat/completions</code></li>
                        <li>模型: <code style={codeStyle}>deepseek-chat</code> 或 <code style={codeStyle}>deepseek-reasoner</code></li>
                    </ul>

                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>🤖 OpenAI</p>
                    <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
                        <li>业界标准，模型强大</li>
                        <li>支持 GPT-4o、GPT-4o-mini 等模型</li>
                    </ul>

                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>🌐 其他兼容接口</p>
                    <ul style={{ paddingLeft: 20 }}>
                        <li>OpenRouter: 统一访问 Claude、GPT 等多种模型</li>
                        <li>选择"自定义"选项，填入任意兼容 OpenAI 格式的 API</li>
                        <li>可以修改 Endpoint 和模型名称来适配不同服务</li>
                    </ul>
                </div>
            </div>

            <div className="settings-card">
                <h3>💡 提示</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <p>• 选择预设服务商后，仍可自定义 Endpoint 和模型名称</p>
                    <p>• API Key 安全存储在本地，不会上传到任何服务器</p>
                    <p>• 如遇问题，请检查 API Key 是否正确、额度是否充足</p>
                </div>
            </div>
        </div>
    );
}
