const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    getPrintJobs: (printerName) => ipcRenderer.invoke('get-print-jobs', printerName),
    setPrintParams: (content) => ipcRenderer.invoke('set-print-params', content),
    setWsToken: (url) => ipcRenderer.invoke('set-ws-token', url),
    setWsUrl: (url) => ipcRenderer.invoke('set-ws-url', url),
    printQRCode: (content, canvasDataURL) => ipcRenderer.invoke('silent-print-qrcode', content, canvasDataURL),
    printBarCode: (content, canvasDataURL) => ipcRenderer.invoke('silent-print-barcode', content, canvasDataURL),
    onPrintStart: (callback) => ipcRenderer.on('print-start', callback),
    onPrintEnd: (callback) => ipcRenderer.on('print-end', callback),
});
