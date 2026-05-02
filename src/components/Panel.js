import { useState, useRef } from '@wordpress/element';
import { Button, TextareaControl, SelectControl, RangeControl, Spinner, Notice } from '@wordpress/components';
import { serialize } from '@wordpress/blocks';
import { rawHandler } from '@wordpress/blocks'; // @wordpress/block-editor 也有 rawHandler 但推荐这里的
import { dispatch } from '@wordpress/data';
import TurndownService from 'turndown'; // 辅助 HTML → Markdown? 我们实际需要 Markdown → HTML
import marked from 'marked'; // 需要安装 marked
import StreamHandler from './StreamHandler';

// 从全局获取配置
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
                onChunk: (text) => {
                    setMarkdown((prev) => prev + text);
                },
                onDone: (fullText) => {
                    setIsGenerating(false);
                },
                onError: (err) => {
                    setError(err.message);
                    setIsGenerating(false);
                },
            });
            await stream.start();
        } catch (e) {
            if (e.name !== 'AbortError') {
                setError(e.message);
            }
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
        
        // Markdown → HTML
        const html = marked.parse(markdown);
        // HTML → 区块
        const blocks = rawHandler({ HTML: html });
        // 插入到编辑器
        dispatch('core/block-editor').insertBlocks(blocks);
        // 清空预览
        setMarkdown('');
    };

    return (
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
                <Button 
                    variant="primary" 
                    onClick={handleGenerate} 
                    disabled={isGenerating || !prompt.trim()}
                >
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
                    <div style={{ maxHeight: '300px', overflow: 'auto', background: '#f0f0f0', padding: '8px', borderRadius: '4px' }}>
                        <pre>{markdown}</pre>
                    </div>
                    <Button variant="secondary" onClick={handleInsert} disabled={isGenerating}>
                        插入为区块
                    </Button>
                </div>
            )}
        </div>
    );
};

export default AIPanel;