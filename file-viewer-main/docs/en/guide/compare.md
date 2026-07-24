# Comparison

File Viewer is a pure frontend file preview component for internal tools, intranet systems, and private deployments. It is designed for quick business-file preview, triage, search, print, export, and self-hosted delivery. It is not a professional editor, and it does not promise native-app fidelity for every complex file.

## File Viewer vs conversion services

| Approach | Strengths | Limits |
| --- | --- | --- |
| Backend conversion | Can normalize files to PDF/images for caching, archival workflows, permission auditing, and unified fallback behavior | Requires conversion workers, queues, temporary files, fonts, caches, retries, and cleanup; private deployment can be costly |
| Office Online / cloud services | High fidelity, low maintenance, mature collaboration features | Not always suitable for intranet, private deployment, sensitive files, offline environments, or strict compliance requirements |
| File Viewer | Pure frontend, self-hostable, lazy-loaded, and easy to embed in business applications | Complex Office / CAD files still need real-file regression; not a replacement for professional editors or archival conversion |

## When File Viewer fits best

- Files should not be sent to a third-party conversion service.
- The app runs in an intranet, private deployment, offline environment, or strict CSP setup.
- One component needs to cover Office, PDF/OFD, CAD, archives, email, images, media, code, and structured data.
- The product goal is preview, triage, search, print, export, and download rather than editing.
- The frontend team wants renderer/preset composition instead of many unrelated viewer embeds.

## When backend conversion is better

- Long-term archival requires every file to become a stable PDF or image.
- Very large files make browser memory or mobile performance the main constraint.
- The workflow needs maximum fidelity, batch conversion, OCR, burned-in watermarks, audit records, or asynchronous review queues.
- The team already runs a reliable LibreOffice, OnlyOffice, or commercial conversion service and can absorb the operational cost.

## Recommended mix

Many production systems can combine both approaches:

- Use File Viewer for instant browser-side preview by default.
- Trigger backend PDF conversion for archival, contracts, audit, or strict consistency cases.
- Self-host Worker, WASM, font, and vendor assets with the rest of the app's static resources.
- Collect real compatibility feedback through issues and sanitized samples instead of trusting synthetic files only.

## Validation checklist

- Try Word, Excel, PowerPoint, PDF, DWG, ZIP, and EML in the [demo](https://demo.file-viewer.app).
- Validate the real formats your product cares about with sanitized files.
- Check mobile WebView behavior, intranet static paths, Worker/WASM MIME types, CSP, and fonts.
- For Office / CAD fidelity, review the [format fidelity notes](./format-fidelity).
