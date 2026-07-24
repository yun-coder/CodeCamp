import {
  defineFileViewerElement,
  type FileViewerElement,
  type ViewerEvent,
} from '@file-viewer/web-full'
import './styles.css'

defineFileViewerElement()

const viewer = document.getElementById('custom-element-viewer') as FileViewerElement | null

if (!viewer) {
  throw new Error('Missing <flyfish-file-viewer> demo element.')
}

viewer.options = {
  theme: 'light',
  toolbar: {
    position: 'bottom-right'
  },
  search: true
}

viewer.addEventListener('viewer-event', event => {
  const detail = (event as CustomEvent<ViewerEvent>).detail
  if (detail.type === 'load-start' || detail.type === 'load-complete') {
    document.body.setAttribute('data-viewer-status', detail.type)
  }
})

viewer.addEventListener('viewer-ready', () => {
  document.body.setAttribute('data-component', 'custom-element')
})
