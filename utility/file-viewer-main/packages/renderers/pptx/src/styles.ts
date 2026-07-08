const legacyPptxCss = `
.slide{position:relative;border:0;border-radius:0;overflow:hidden;margin-bottom:50px;margin-left:auto;margin-right:auto;z-index:100}
.slide div.block{position:absolute;top:0;left:0;width:100%;line-height:1}
.slide div.content{display:flex;flex-direction:column}
.slide div.diagram-content{display:flex;flex-direction:column}
.slide div.content-rtl{display:flex;flex-direction:column;direction:rtl}
.slide .pregraph-rtl{direction:rtl}
.slide .pregraph-ltr{direction:ltr}
.slide .pregraph-inherit{direction:inherit}
.slide .slide-prgrph{width:100%}
.slide .line-break-br::before{content:"\\A";white-space:pre}
.slide div.v-up{justify-content:flex-start}
.slide div.v-mid{justify-content:center}
.slide div.v-down{justify-content:flex-end}
.slide div.h-left{justify-content:flex-start;align-items:flex-start;text-align:left}
.slide div.h-left-rtl{justify-content:flex-end;align-items:flex-end;text-align:left}
.slide div.h-mid{justify-content:center;align-items:center;text-align:center}
.slide div.h-right{justify-content:flex-end;align-items:flex-end;text-align:right}
.slide div.h-right-rtl{justify-content:flex-start;align-items:flex-start;text-align:right}
.slide div.h-just,.slide div.h-dist{text-align:justify}
.slide div.up-left{justify-content:flex-start;align-items:flex-start;text-align:left}
.slide div.up-center{justify-content:flex-start;align-items:center}
.slide div.up-right{justify-content:flex-start;align-items:flex-end}
.slide div.center-left{justify-content:center;align-items:flex-start;text-align:left}
.slide div.center-center{justify-content:center;align-items:center}
.slide div.center-right{justify-content:center;align-items:flex-end}
.slide div.down-left{justify-content:flex-end;align-items:flex-start;text-align:left}
.slide div.down-center{justify-content:flex-end;align-items:center}
.slide div.down-right{justify-content:flex-end;align-items:flex-end}
.slide li.slide{margin:10px 0;font-size:18px}
.slide table{position:absolute}
.slide svg.drawing{position:absolute;overflow:visible}
`;

export const pptxViewerCss = `
.flyfish-pptx-scale-box{box-sizing:border-box;max-width:100%;margin:0 auto;min-width:0}
.flyfish-pptx-content{position:relative;box-sizing:border-box;max-width:none;min-width:0;transform-origin:top left;will-change:transform}
.flyfish-pptx-content[data-render-state="loading"]{opacity:.82}
.flyfish-pptx-content .slide{background:#fff;box-shadow:0 18px 36px rgba(18,35,52,.12)}
.flyfish-pptx-thumbnail{display:block;box-sizing:border-box;width:min(960px,100%);height:auto;margin:0 auto 28px;border-radius:12px;background:#fff;box-shadow:0 18px 36px rgba(18,35,52,.14)}
${legacyPptxCss}
`;

const PPTX_STYLE_ID = 'flyfish-pptx-native-style';

export const ensurePptxViewerStyles = (documentRef: Document) => {
  if (documentRef.getElementById(PPTX_STYLE_ID)) {
    return;
  }

  const style = documentRef.createElement('style');
  style.id = PPTX_STYLE_ID;
  style.textContent = pptxViewerCss;
  (documentRef.head || documentRef.documentElement).appendChild(style);
};
