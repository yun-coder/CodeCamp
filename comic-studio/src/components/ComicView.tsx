import * as API from '../api';
import type { ComicBookPlan, WorkflowPhase } from '../types';
import { ExportPhase } from './ExportPhase';
import { ImagePhase } from './ImagePhase';
import { ScriptPhase } from './ScriptPhase';
import { StoryPhase } from './StoryPhase';

interface Props {
  projectId: string;
  plan: ComicBookPlan | null;
  phase: WorkflowPhase;
  setPhase: (p: WorkflowPhase) => void;
  generating: boolean;
  setGenerating: (g: boolean) => void;
  updatePlan: (p: ComicBookPlan) => void;
  handleStoryEvents: (ev: Record<string, unknown>) => void;
  handlePanelEvents: (ev: Record<string, unknown>) => void;
  handleImageEvents: (ev: Record<string, unknown>) => void;
  showToast: (msg: string) => void;
}

export function ComicView(props: Props) {
  const { projectId, plan, phase, generating, showToast } = props;

  const startStory = async (
    idea: string,
    style: string,
    audience: string,
    language: string,
    pageCount: number,
    format: string,
  ) => {
    props.setGenerating(true);
    try {
      await API.generateStory(projectId, idea, style, audience, language, pageCount, format, props.handleStoryEvents);
    } catch (e) {
      console.error('[ComicFactory] 生成故事失败:', e);
      showToast(`错误：${e instanceof Error ? e.message : String(e)}`);
      props.setGenerating(false);
    }
  };

  const startPanels = async () => {
    props.setGenerating(true);
    try {
      await API.generatePanels(projectId, props.handlePanelEvents);
    } catch (e) {
      console.error('[ComicFactory] 生成分镜失败:', e);
      showToast(`错误：${e instanceof Error ? e.message : String(e)}`);
      props.setGenerating(false);
    }
  };

  const startImages = async () => {
    props.setGenerating(true);
    try {
      await API.generateAllImages(projectId, props.handleImageEvents);
    } catch (e) {
      console.error('[ComicFactory] 生成图片失败:', e);
      showToast(`错误：${e instanceof Error ? e.message : String(e)}`);
      props.setGenerating(false);
    }
  };

  if (phase === 'idea' || !plan) {
    return (
      <div className="idea-phase">
        <h2>生成漫画小说图片集合</h2>
        <p className="idea-sub">粘贴故事梗概、章节片段或商业方案，先生成小说设定与角色视觉锁定。</p>
        <div className="idea-form">
          <textarea
            id="ideaInput"
            rows={6}
            placeholder="例如：一个收到神秘信件的女孩，在校园与家庭之间发现自己的命运线索。需要彩色漫画小说风格，适合连续图集展示。"
            disabled={generating}
          />
          <div className="idea-row">
            <select id="styleSelect" defaultValue="webtoon-color">
              <option value="webtoon-color">彩色漫画小说</option>
              <option value="american-color">美式彩漫</option>
              <option value="childrens-picture-book">儿童绘本</option>
              <option value="european-bd">欧漫 BD</option>
              <option value="watercolor">水彩插画</option>
              <option value="noir-color">彩色黑色电影</option>
            </select>
            <select id="audienceSelect" defaultValue="teen">
              <option value="children">儿童 6-12</option>
              <option value="teen">青少年 13-18</option>
              <option value="adult">成人</option>
              <option value="education">教育内容</option>
              <option value="brand">品牌/商业</option>
            </select>
            <select id="langSelect" defaultValue="zh">
              <option value="zh">中文</option>
              <option value="en">英文</option>
              <option value="ja">日文</option>
            </select>
          </div>
          <div className="idea-row">
            <select id="formatSelect" defaultValue="book">
              <option value="book">横版图册/书页</option>
              <option value="webtoon">竖版长图</option>
              <option value="strip">短篇条漫</option>
            </select>
            <select id="pageCountSelect" defaultValue="8">
              <option value="4">4 组画面</option>
              <option value="6">6 组画面</option>
              <option value="8">8 组画面</option>
              <option value="12">12 组画面</option>
              <option value="16">16 组画面</option>
            </select>
          </div>
          <div className="action-bar">
            <button
              className="btn-primary"
              disabled={generating}
              onClick={() => {
                const ideaInput = document.getElementById('ideaInput') as HTMLTextAreaElement | null;
                if (!ideaInput?.value.trim()) {
                  showToast('请先输入故事或商业方案');
                  return;
                }
                startStory(
                  ideaInput.value,
                  (document.getElementById('styleSelect') as HTMLSelectElement).value,
                  (document.getElementById('audienceSelect') as HTMLSelectElement).value,
                  (document.getElementById('langSelect') as HTMLSelectElement).value,
                  Number((document.getElementById('pageCountSelect') as HTMLSelectElement).value),
                  (document.getElementById('formatSelect') as HTMLSelectElement).value,
                );
              }}
            >
              {generating ? '正在生成小说设定...' : '生成小说设定'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  switch (phase) {
    case 'story':
      return <StoryPhase plan={plan} generating={generating} onGeneratePanels={startPanels} />;
    case 'script':
      return (
        <ScriptPhase
          plan={plan}
          generating={generating}
          onGenerateImages={startImages}
          updatePlan={props.updatePlan}
          onNextPhase={() => props.setPhase('images')}
        />
      );
    case 'images':
      return (
        <ImagePhase
          projectId={projectId}
          plan={plan}
          generating={generating}
          onGenerateImages={startImages}
          onExport={() => props.setPhase('export')}
          onRegeneratePanel={async (pid) => {
            try {
              await API.generateSingleImage(projectId, pid);
              showToast('已重新生成');
            } catch {
              showToast('重新生成失败');
            }
          }}
        />
      );
    case 'export':
      return <ExportPhase projectId={projectId} plan={plan} />;
    default:
      return null;
  }
}
