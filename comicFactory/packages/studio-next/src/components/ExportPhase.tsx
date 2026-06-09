import * as API from '../api';
import type { ComicBookPlan } from '../types';

interface Props {
  projectId: string;
  plan: ComicBookPlan;
}

export function ExportPhase({ projectId, plan }: Props) {
  const handleExport = async (type: 'pdf' | 'png' | 'webtoon') => {
    try {
      let result;
      if (type === 'pdf') result = await API.exportComicPdf(projectId);
      else if (type === 'png') result = await API.exportComicPng(projectId);
      else result = await API.exportComicWebtoon(projectId);
      alert(`导出完成：${JSON.stringify(result)}`);
    } catch (e) {
      alert(`导出失败：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const totalImages = plan.pages.reduce((sum, p) => sum + p.panels.length, 0);
  const generatedImages = plan.pages.reduce(
    (sum, p) => sum + p.panels.filter((panel) => panel.generatedImageAssetId).length,
    0,
  );

  return (
    <div className="export-phase">
      <h2>导出漫画小说图片集合</h2>
      <p className="phase-summary">
        {plan.pages.length} 组画面 · {generatedImages}/{totalImages} 张图片
      </p>

      {plan.pages.length > 0 && <iframe className="preview-frame" src={API.getComicPreviewUrl(projectId)} title="漫画图集预览" />}

      <div className="export-options">
        <button className="export-option" onClick={() => handleExport('pdf')}>
          <span className="export-icon">PDF</span>
          <span className="export-label">导出 PDF 图册</span>
          <span className="export-hint">适合提案、打印或客户审阅</span>
        </button>
        <button className="export-option" onClick={() => handleExport('png')}>
          <span className="export-icon">PNG</span>
          <span className="export-label">导出 PNG 图片集合</span>
          <span className="export-hint">按页输出独立图片文件</span>
        </button>
        <button className="export-option" onClick={() => handleExport('webtoon')}>
          <span className="export-icon">LONG</span>
          <span className="export-label">导出竖版长图</span>
          <span className="export-hint">适合移动端连续阅读</span>
        </button>
      </div>
    </div>
  );
}
