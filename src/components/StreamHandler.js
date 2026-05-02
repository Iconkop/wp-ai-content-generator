class StreamHandler {
    constructor({ baseUrl, apiKey, model, prompt, temperature, signal, onChunk, onDone, onError }) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.prompt = prompt;
        this.temperature = temperature;
        this.signal = signal;
        this.onChunk = onChunk;
        this.onDone = onDone;
        this.onError = onError;
    }

    async start() {
        const url = `${this.baseUrl}/chat/completions`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: '你是一个专业的内容编写助手，直接输出用户要求的内容，使用Markdown格式。'
                        },
                        { role: 'user', content: this.prompt }
                    ],
                    temperature: this.temperature,
                    stream: true,
                }),
                signal: this.signal,
            });

            if (!response.ok) {
                const errorData = await response.text();
                this.onError(new Error(`API 请求失败: ${response.status} ${errorData}`));
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    this.onDone();
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                // 处理 SSE 行格式
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data:')) continue;
                    const dataStr = trimmed.slice(5).trim();
                    if (dataStr === '[DONE]') {
                        this.onDone();
                        return;
                    }
                    try {
                        const json = JSON.parse(dataStr);
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) {
                            this.onChunk(delta);
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.onError(error);
            }
        }
    }
}

export default StreamHandler;