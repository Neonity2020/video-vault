import { useState, useEffect } from 'react';
import { AppSettings } from '../types';

interface SettingsProps {
    settings: AppSettings;
    onSave: (settings: AppSettings) => void;
    saving: boolean;
}

const PROVIDER_PRESETS = {
    gemini: {
        label: '✨ Google Gemini（免费）',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-2.5-flash',
        keyPlaceholder: 'AIza...',
        keyUrl: 'https://aistudio.google.com/apikey',
    },
    openai: {
        label: '🤖 OpenAI 兼容',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        keyPlaceholder: 'sk-...',
        keyUrl: 'https://platform.openai.com/api-keys',
    },
};

const codeStyle = { color: 'var(--text-accent)', background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: 4 };

export default function Settings({ settings, onSave, saving }: SettingsProps) {
    const [form, setForm] = useState<AppSettings>(settings);
    const [saved, setSaved] = useState(false);

    useEffect(() => { setForm(settings); }, [settings]);

    const handleSave = async () => {
        try {
            await onSave(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch { }
    };

    const handleProviderChange = (provider: 'openai' | 'gemini') => {
        const preset = PROVIDER_PRESETS[provider];
        setForm({
            api_provider: provider,
            api_endpoint: preset.endpoint,
            api_key: form.api_key, // keep existing key
            model: preset.model,
        });
    };

    const preset = PROVIDER_PRESETS[form.api_provider] || PROVIDER_PRESETS.gemini;

    return (
        <div className="settings-page">
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>
                <span style={{ marginRight: 8 }}>⚙️</span>设置
            </h2>

            <div className="settings-card">
                <h3>🤖 AI 总结配置</h3>

                {/* Provider Selector */}
                <div className="form-group">
                    <label className="form-label">API 服务商</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                        {(Object.keys(PROVIDER_PRESETS) as Array<'gemini' | 'openai'>).map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleProviderChange(key)}
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    borderRadius: 'var(--radius-md)',
                                    border: `2px solid ${form.api_provider === key ? 'var(--accent)' : 'var(--border-color)'}`,
                                    background: form.api_provider === key ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-glass)',
                                    color: form.api_provider === key ? 'var(--accent)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontWeight: form.api_provider === key ? 600 : 400,
                                    fontSize: 14,
                                    transition: 'all 200ms ease',
                                }}
                            >
                                {PROVIDER_PRESETS[key].label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">API Endpoint</label>
                    <input
                        className="form-input"
                        type="url"
                        value={form.api_endpoint}
                        onChange={(e) => setForm({ ...form, api_endpoint: e.target.value })}
                        placeholder={preset.endpoint}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">
                        API Key
                        <a href={preset.keyUrl} target="_blank" rel="noopener noreferrer"
                            style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                            获取 Key →
                        </a>
                    </label>
                    <input
                        className="form-input"
                        type="password"
                        value={form.api_key}
                        onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                        placeholder={preset.keyPlaceholder}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">模型</label>
                    <input
                        className="form-input"
                        type="text"
                        value={form.model}
                        onChange={(e) => setForm({ ...form, model: e.target.value })}
                        placeholder={preset.model}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? '保存中...' : '💾 保存设置'}
                    </button>
                    {saved && <span className="save-indicator">✓ 已保存</span>}
                </div>
            </div>

            <div className="settings-card">
                <h3>📖 使用说明</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 2 }}>
                    <p><strong>Gemini（推荐 · 免费）</strong></p>
                    <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
                        <li>前往 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Google AI Studio</a> 获取免费 API Key</li>
                        <li>推荐模型: <code style={codeStyle}>gemini-2.5-flash</code>（快速）或 <code style={codeStyle}>gemini-3.0-pro</code>（高质量）</li>
                    </ul>
                    <p><strong>OpenAI 兼容</strong></p>
                    <ul style={{ paddingLeft: 20 }}>
                        <li>OpenAI: <code style={codeStyle}>https://api.openai.com/v1/chat/completions</code></li>
                        <li>DeepSeek: <code style={codeStyle}>https://api.deepseek.com/chat/completions</code></li>
                        <li>其他兼容接口: 填入对应的 Endpoint 和模型名即可</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
