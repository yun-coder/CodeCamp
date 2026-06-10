import { useCallback, useEffect, useRef, useState } from 'react';
import { readSSE } from '../api';
import type { ChatMessage } from '../types';

interface Props {
  projectId: string | null;
  generating: boolean;
}

export function ChatPanel({ projectId, generating }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  // Load message history when project changes
  useEffect(() => {
    if (!projectId) {
      setMessages([]);
      return;
    }
    fetch(`/api/projects/${projectId}/messages`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages || []))
      .catch((e) => console.error('[ComicFactory] 加载消息历史失败:', e));
  }, [projectId]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !projectId || streaming) return;

    const userMsg: ChatMessage = { role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setError(null);

    // Collect assistant reply chunks
    let assistantContent = '';

    try {
      await readSSE(
        `/api/projects/${projectId}/messages`,
        { content: userMsg.content },
        (ev) => {
          if (ev.type === 'token' && typeof ev.text === 'string') {
            assistantContent += ev.text;
            // Update the in-progress message
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && last.role === 'assistant' && (last as unknown as Record<string, unknown>)._streaming) {
                copy[copy.length - 1] = { ...last, content: assistantContent };
              } else {
                const newMsg: ChatMessage = { role: 'assistant', content: assistantContent, timestamp: new Date().toISOString() };
                (newMsg as unknown as Record<string, unknown>)._streaming = true;
                copy.push(newMsg);
              }
              return copy;
            });
          } else if (ev.type === 'done') {
            // Finalize the message — remove _streaming flag
            setMessages((prev) => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last && (last as unknown as Record<string, unknown>)._streaming) {
                const final: ChatMessage = { role: last.role, content: last.content };
                if (last.timestamp) final.timestamp = last.timestamp;
                copy[copy.length - 1] = final;
              }
              return copy;
            });
          } else if (ev.type === 'error') {
            console.error('[ComicFactory] 助手回复错误:', ev.message);
            setError(typeof ev.message === 'string' ? ev.message : '助手回复出错');
          }
        },
      );
    } catch (e) {
      console.error('[ComicFactory] 发送消息失败:', e);
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setStreaming(false);
    }
  }, [input, projectId, streaming]);

  return (
    <aside className="chat-panel">
      <div className="chat-head">
        <h3>创作助手</h3>
        {(generating || streaming) && (
          <span className="generating-text">
            <span className="generating-dot" /> {streaming ? '回复中...' : '生成中...'}
          </span>
        )}
      </div>
      <div className="chat-log" ref={logRef}>
        {messages.length === 0 && (
          <div className="chat-msg assistant">
            <div className="role-label">Comic Factory</div>
            <div>输入故事梗概或商业方案后，我会帮你生成小说设定、角色视觉锁定、章节画面清单和最终图片集合。</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.role === 'assistant' && <div className="role-label">助手</div>}
            <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
          </div>
        ))}
        {error && (
          <div className="chat-msg system" style={{ color: 'var(--red)' }}>
            ⚠ {error}
          </div>
        )}
      </div>
      <div className="chat-composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={projectId ? '补充角色、风格、章节或商业卖点...' : '请先选择或新建项目'}
          rows={2}
          disabled={generating || streaming || !projectId}
        />
        <button onClick={handleSend} disabled={generating || streaming || !input.trim() || !projectId}>
          发送
        </button>
      </div>
    </aside>
  );
}
