/**
 * studio-next - AI comic novel image collection generator.
 * 3-column: Sidebar | Comic Workbench | AI Chat
 * Workflow: Idea -> Story Bible -> Image List -> Image Collection -> Export
 */
import { useCallback, useEffect, useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { ComicView } from './components/ComicView';
import { ProjectSidebar } from './components/ProjectSidebar';
import * as API from './api';
import type { ComicBookPlan, Project, WorkflowPhase } from './types';
import './App.css';

const PHASES: WorkflowPhase[] = ['idea', 'story', 'script', 'images', 'export'];

const PHASE_LABELS: Record<WorkflowPhase, string> = {
  idea: '创意',
  story: '小说设定',
  script: '图片清单',
  images: '图片集合',
  export: '导出',
};

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plan, setPlan] = useState<ComicBookPlan | null>(null);
  const [phase, setPhase] = useState<WorkflowPhase>('idea');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [minimaxOk, setMinimaxOk] = useState(true);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const logError = useCallback((ctx: string, err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ComicFactory] ${ctx}:`, err);
    setLastError(`${ctx}: ${msg}`);
    showToast(`${ctx}: ${msg}`);
  }, [showToast]);

  useEffect(() => {
    API.listProjects()
      .then(setProjects)
      .catch((e) => logError('项目加载失败', e))
      .finally(() => setLoading(false));
    // Check MiniMax API key status
    fetch('/api/config/minimax')
      .then((r) => r.json())
      .then((d) => setMinimaxOk(d.configured))
      .catch(() => setMinimaxOk(false));
  }, [logError]);

  const newProject = async () => {
    try {
      const p = await API.createProject(`漫画图集 ${new Date().toLocaleDateString('zh-CN')}`);
      setProjects((prev) => [p, ...prev]);
      setSelectedId(p.id);
      setPlan(null);
      setPhase('idea');
      setLastError(null);
    } catch (e) {
      logError('创建项目失败', e);
    }
  };

  const selectProject = async (id: string) => {
    setSelectedId(id);
    setPlan(null);
    setPhase('idea');
    try {
      const p = await API.getComicPlan(id);
      if (p) {
        setPlan(p);
        if (p.pages.some((pg) => pg.panels.some((pn) => pn.generatedImageAssetId))) setPhase('images');
        else if (p.pages.length > 0) setPhase('script');
        else if (p.characters.length > 0) setPhase('story');
      }
    } catch {
      // Project may not have a comic plan yet.
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await API.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setPlan(null);
        setPhase('idea');
        setLastError(null);
      }
    } catch (e) {
      logError('删除失败', e);
    }
  };

  const updatePlan = (p: ComicBookPlan) => {
    setPlan(p);
    if (selectedId) API.saveComicPlan(selectedId, p).catch((e) => logError('保存失败', e));
  };

  const handleStoryEvents = (ev: Record<string, unknown>) => {
    if (ev.type === 'story_done' && ev.plan) {
      setPlan(ev.plan as ComicBookPlan);
      setPhase('story');
      setGenerating(false);
      setLastError(null);
      showToast('小说设定已生成');
    } else if (ev.type === 'story_failed') {
      setGenerating(false);
      logError('生成小说设定失败', ev.message || '未知错误');
    }
  };

  const handlePanelEvents = (ev: Record<string, unknown>) => {
    if (ev.type === 'panels_done' && ev.plan) {
      setPlan(ev.plan as ComicBookPlan);
      setPhase('script');
      setGenerating(false);
      setLastError(null);
      showToast(`图片清单已生成：${ev.totalPanels || 0} 张`);
    } else if (ev.type === 'panels_failed') {
      setGenerating(false);
      logError('生成图片清单失败', ev.message || '未知错误');
    }
  };

  const handleImageEvents = (ev: Record<string, unknown>) => {
    if (ev.type === 'images_all_done' && ev.plan) {
      setPlan(ev.plan as ComicBookPlan);
      setPhase('images');
      setGenerating(false);
      setLastError(null);
      showToast(`图片集合已生成：${ev.totalGenerated || 0}/${ev.total || 0}`);
    } else if (ev.type === 'images_failed') {
      setGenerating(false);
      logError('生成图片失败', ev.message || '未知错误');
    }
  };

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <div className="logo">CF</div>
          <h1>Comic Factory</h1>
          <span className="v">image set</span>
        </div>
        <div className="toolbar-center">
          {selectedId && plan && (
            <div className="phase-indicator">
              {PHASES.map((p) => (
                <button
                  key={p}
                  className={`phase-dot ${phase === p ? 'active' : ''}`}
                  onClick={() => setPhase(p)}
                  title={PHASE_LABELS[p]}
                >
                  <span>{PHASE_LABELS[p]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="toolbar-right">
          <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)} title="切换项目栏">
            P
          </button>
          <button className="icon-btn" onClick={() => setChatOpen(!chatOpen)} title="切换助手栏">
            A
          </button>
        </div>
      </header>
      <div className={`body ${!sidebarOpen ? 'sidebar-closed' : ''} ${!chatOpen ? 'chat-closed' : ''}`}>
        <ProjectSidebar
          projects={projects}
          selectedId={selectedId}
          onSelect={selectProject}
          onNew={newProject}
          onDelete={deleteProject}
        />
        <main className="workbench">
          {!minimaxOk && (
            <div className="warning-banner">
              <span className="warning-banner-text">⚠️ 未配置 MiniMax API Key — 无法生成图像。请在设置中配置或设置环境变量 OD_MINIMAX_API_KEY。</span>
            </div>
          )}
          {lastError && (
            <div className="error-banner">
              <span className="error-banner-text">{lastError}</span>
              <button className="error-banner-close" onClick={() => setLastError(null)}>✕</button>
            </div>
          )}
          {loading ? (
            <div className="empty-state">
              <div className="ico">CF</div>
              <h2>加载中...</h2>
            </div>
          ) : selectedId ? (
            <ComicView
              projectId={selectedId}
              plan={plan}
              phase={phase}
              setPhase={setPhase}
              generating={generating}
              setGenerating={setGenerating}
              updatePlan={updatePlan}
              handleStoryEvents={handleStoryEvents}
              handlePanelEvents={handlePanelEvents}
              handleImageEvents={handleImageEvents}
              showToast={showToast}
            />
          ) : (
            <div className="empty-state">
              <div className="ico">CF</div>
              <h2>生成漫画小说图片集合</h2>
              <p>新建项目，输入故事梗概或商业方案，生成角色设定、章节画面清单和可导出的彩色漫画图集。</p>
              <button className="btn-primary" onClick={newProject}>
                新建漫画图集
              </button>
            </div>
          )}
        </main>
        {chatOpen && <ChatPanel projectId={selectedId} generating={generating} />}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
