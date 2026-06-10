import type { ComicBookPlan, ComicPanel } from '../types';

interface Props {
  projectId: string;
  plan: ComicBookPlan;
  generating: boolean;
  onGenerateImages: () => void;
  onRegeneratePanel: (panelId: string) => void;
  onExport: () => void;
}

interface PanelEntry {
  pageOrder: number;
  panel: ComicPanel;
}

export function ImagePhase({ projectId, plan, generating, onGenerateImages, onRegeneratePanel, onExport }: Props) {
  const entries: PanelEntry[] = plan.pages
    .slice()
    .sort((a, b) => a.order - b.order)
    .flatMap((page) =>
      page.panels
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((panel) => ({ pageOrder: page.order, panel })),
    );
  const generatedCount = entries.filter(({ panel }) => panel.generatedImageAssetId).length;

  return (
    <div className="image-phase">
      <h2>{plan.title} - 图片集合</h2>
      <p className="phase-summary">
        {generatedCount}/{entries.length} 张图片已生成
      </p>
      <div className="action-bar">
        <button className="btn-primary" disabled={generating} onClick={onGenerateImages}>
          {generating ? (
            <>
              <span className="generating-dot" /> 正在生成...
            </>
          ) : (
            '重新生成全部'
          )}
        </button>
        <button className="btn-secondary" onClick={() => window.open(`/api/projects/${projectId}/comic/preview`, '_blank')}>
          打开完整预览
        </button>
        <button className="btn-secondary" onClick={onExport}>
          导出图集
        </button>
      </div>
      {generating && (
        <div className="progress-bar">
          <div className="fill" style={{ width: '60%' }} />
        </div>
      )}
      <div className="image-grid">
        {entries.map(({ pageOrder, panel }) => (
          <div key={panel.id} className={`image-card ${!panel.generatedImageAssetId ? 'placeholder' : ''}`}>
            {panel.generatedImageAssetId ? (
              <>
                <img
                  src={`/preview/${projectId}/comic/images/${panel.generatedImageAssetId}.png`}
                  alt={`第 ${pageOrder} 组第 ${panel.order} 张`}
                />
                <div className="img-label">
                  第 {pageOrder} 组 · 第 {panel.order} 张
                  <button
                    className="mini-action"
                    onClick={() => onRegeneratePanel(panel.id)}
                    disabled={generating}
                    title="重新生成这张图"
                  >
                    重绘
                  </button>
                </div>
              </>
            ) : (
              <span>
                第 {pageOrder} 组 · 第 {panel.order} 张
                <br />
                <small>{panel.imagePrompt.slice(0, 70)}...</small>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
