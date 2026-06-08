import type { EngineAdapter } from '@video-pipeline/core';
import { capabilities } from './capabilities.js';
import { validate } from './validate.js';
import { render, renderToHtml } from './render.js';

const adapter: EngineAdapter = {
  id: 'hyperframes',
  name: 'Hyperframes',
  upstreamVersion: '0.4.x',
  capabilities,
  validate,
  render,
  renderToHtml,
};

export default adapter;
export { adapter };
