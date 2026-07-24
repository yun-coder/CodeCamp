import processPptx from './engine/process.js';

processPptx(
  (messageHandler: (message: unknown) => void, errorHandler: (error: unknown) => void) => {
    self.onmessage = event => messageHandler(event.data);
    self.onerror = event => errorHandler(event);
  },
  (message: unknown) => self.postMessage(message)
);
