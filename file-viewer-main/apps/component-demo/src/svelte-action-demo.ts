import fileViewer from '@file-viewer/svelte-full/action'
import './styles.css'

const host = document.getElementById('svelte-viewer')

if (!host) {
  throw new Error('Missing #svelte-viewer host element.')
}

fileViewer(host, {
  url: '/example/word.docx',
  options: {
    theme: 'light',
    toolbar: {
      position: 'bottom-right'
    }
  }
})

document.body.setAttribute('data-component', 'svelte-action')
