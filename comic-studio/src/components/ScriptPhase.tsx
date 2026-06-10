import type { ComicBookPlan } from '../types';

interface Props {
  plan: ComicBookPlan;
  generating: boolean;
  onGenerateImages: () => void;
  updatePlan: (p: ComicBookPlan) => void;
  onNextPhase: () => void;
}

export function ScriptPhase({ plan, generating, onGenerateImages, onNextPhase }: Props) {
  const pages = plan.pages.slice().sort((a, b) => a.order - b.order);
  const totalImages = pages.reduce((sum, page) => sum + page.panels.length, 0);

  return (
    <div className="script-phase">
      <h2>{plan.title} - 图片清单</h2>
      <p className="phase-summary">
        {pages.length} 组画面 · {totalImages} 张待生成图片
      </p>
      {pages.map((page) => (
        <div key={page.id} className="page-card">
          <div className="page-header">
            <span className="page-num">{page.order}</span>
            <span className="page-title-text">{page.title || `第 ${page.order} 组`}</span>
            <span className="page-layout">{page.layout}</span>
          </div>
          <p className="page-summary-inline">{page.summary}</p>
          <div className="panel-grid">
            {page.panels
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((panel) => (
                <div key={panel.id} className="panel-card">
                  <div className="panel-shot">{panel.shot}</div>
                  <div className="panel-scene">{panel.scene.slice(0, 70)}</div>
                  <div className="panel-action">{panel.action.slice(0, 90)}</div>
                  <div className="panel-prompt">{panel.imagePrompt.slice(0, 120)}...</div>
                  <div className="panel-letters">
                    {panel.lettering.map((l) => (
                      <span key={l.id} className="ltr-chip" title={l.text}>
                        {l.kind}: {l.text.slice(0, 32)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
      <div className="action-bar">
        <button className="btn-primary" disabled={generating} onClick={onGenerateImages}>
          {generating ? (
            <>
              <span className="generating-dot" /> 正在生成图片...
            </>
          ) : (
            '生成全部图片'
          )}
        </button>
        <button className="btn-secondary" onClick={onNextPhase}>
          查看图片集合
        </button>
      </div>
    </div>
  );
}
