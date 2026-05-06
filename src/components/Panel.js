import { useState, useRef, Component } from '@wordpress/element';
import {
    Button,
    TextareaControl,
    SelectControl,
    RangeControl,
    Spinner,
    Notice,
} from '@wordpress/components';
import { rawHandler, createBlock } from '@wordpress/blocks';   // ✅ 直接从 blocks 导入
import { dispatch } from '@wordpress/data';

// 动态加载 marked，防止 ESM 导入失败
let __marked = null;
try {
    const markedModule = require('marked');
    __marked = markedModule?.marked || markedModule;
} catch (e) {
    console.warn('marked 加载失败，将使用纯文本插入');
}

// 错误边界，防止整个侧边栏崩溃
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 16 }}>
                    <Notice status="error" isDismissible={false}>
                        面板加载失败：{this.state.error?.message}
                    </Notice>
                </div>
            );
        }
        return this.props.children;
    }
}

import StreamHandler from './StreamHandler';

const { apiBase, apiKey, models, temperature } = window.aicgData;

const AIPanel = () => {
    const [prompt, setPrompt] = useState('');
    const [selectedModel, setSelectedModel] = useState(models[0] || '');
    const [temp, setTemp] = useState(temperature);
    const [isGenerating, setIsGenerating] = useState(false);
    const [markdown, setMarkdown] = useState('');
    const [error, setError] = useState('');
    const abortControllerRef = useRef(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setError('');
        setMarkdown('');
        setIsGenerating(true);
        abortControllerRef.current = new AbortController();

        try {
            const stream = new StreamHandler({
                baseUrl: apiBase,
                apiKey: apiKey,
                model: selectedModel,
                prompt,
                temperature: temp,
                signal: abortControllerRef.current.signal,
                onChunk: (text) => setMarkdown((prev) => prev + text),
                onDone: () => setIsGenerating(false),
                onError: (err) => {
                    setError(err.message);
                    setIsGenerating(false);
                },
            });
            await stream.start();
        } catch (e) {
            if (e.name !== 'AbortError') setError(e.message);
            setIsGenerating(false);
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsGenerating(false);
        }
    };

    const handleInsert = () => {
        if (!markdown.trim()) return;
        try {
            let html;
            if (typeof __marked?.parse === 'function') {
                html = __marked.parse(markdown);
            } else {
                // 降级：将 markdown 原样作为 HTML 区块（用 <pre> 包裹）
                html = `<pre>${markdown}</pre>`;
            }

            // rawHandler 从 @wordpress/blocks 导入，兼容性更好
            const blocks = rawHandler?.({ HTML: html }) || [];
            if (!blocks || blocks.length === 0) {
                const fallbackBlock = createBlock('core/html', { content: html });
                dispatch('core/block-editor').insertBlocks([fallbackBlock]);
            } else {
                dispatch('core/block-editor').insertBlocks(blocks);
            }
            setMarkdown('');
            setError('');
        } catch (err) {
            setError(`插入失败：${err.message}`);
        }
    };

    return (
        <ErrorBoundary>
            <div style={{ padding: '16px' }}>
                <TextareaControl
                    label="提示词"
                    value={prompt}
                    onChange={setPrompt}
                    placeholder="输入你想要生成的内容主题..."
                    rows={4}
                    disabled={isGenerating}
                />
                <SelectControl
                    label="模型"
                    value={selectedModel}
                    options={models.map(m => ({ label: m, value: m }))}
                    onChange={setSelectedModel}
                    disabled={isGenerating}
                />
                <RangeControl
                    label="发散度"
                    value={temp}
                    onChange={setTemp}
                    min={0}
                    max={2}
                    step={0.1}
                    disabled={isGenerating}
                />
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Button variant="primary" onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                        {isGenerating ? '生成中…' : '生成内容'}
                    </Button>
                    {isGenerating && (
                        <Button variant="secondary" onClick={handleStop}>停止</Button>
                    )}
                </div>
                {isGenerating && <Spinner />}
                {error && <Notice status="error" isDismissible={false}>{error}</Notice>}
                {markdown && (
                    <div style={{ marginTop: '12px' }}>
                        <h4>生成预览</h4>
                        <div style={{
                            maxHeight: '300px',
                            overflow: 'auto',
                            background: '#f0f0f0',
                            padding: '8px',
                            borderRadius: '4px',
                        }}>
                            <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{markdown}</pre>
                        </div>
                        <Button variant="secondary" onClick={handleInsert} disabled={isGenerating}>
                            插入为区块
                        </Button>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};

// 用 ErrorBoundary 包裹后导出
export default () => (
    <ErrorBoundary>
        <AIPanel />
    </ErrorBoundary>
);