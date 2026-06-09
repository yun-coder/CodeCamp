import type { ComicBookPlan } from '../types';

interface Props {
  plan: ComicBookPlan;
  generating: boolean;
  onGeneratePanels: () => void;
}

export function StoryPhase({ plan, generating, onGeneratePanels }: Props) {
  return (
    <div className="story-phase">
      <h2>{plan.title}</h2>
      <div className="story-meta">
        <span>风格：{plan.style}</span>
        <span>受众：{plan.audience}</span>
        <span>画面组数：{plan.pageCount}</span>
        <span>语言：{plan.language}</span>
      </div>
      <p className="story-synopsis">
        <strong>一句话钩子：</strong>
        {plan.logline}
      </p>
      <div className="story-synopsis">{plan.synopsis}</div>

      <h2 className="section-title">角色视觉锁定 ({plan.characters.length})</h2>
      <div className="char-grid">
        {plan.characters.map((c) => (
          <div key={c.id} className="char-card">
            <div className="char-name">{c.name}</div>
            <div className="char-role">{c.role}</div>
            <p className="char-personality">{c.personality}</p>
            <div className="char-visual">
              <strong>外观：</strong>
              {c.visual.description.slice(0, 140)}
              {c.visual.description.length > 140 ? '...' : ''}
            </div>
            <div className="char-palette">
              {c.visual.palette.map((color, i) => (
                <div key={`${c.id}-${color}-${i}`} className="swatch" style={{ background: color }} title={color} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="action-bar">
        <button className="btn-primary" disabled={generating} onClick={onGeneratePanels}>
          {generating ? (
            <>
              <span className="generating-dot" /> 正在生成图片清单...
            </>
          ) : (
            '生成章节画面清单'
          )}
        </button>
      </div>
    </div>
  );
}
