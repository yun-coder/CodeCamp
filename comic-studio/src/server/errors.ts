/**
 * Stable error codes for the comic-studio server.
 *
 * Modeled after the parent monorepo's RFC-01/RFC-05 set, but trimmed to the
 * subset a 5-phase comic workflow can actually surface.
 */

export type ErrorCode =
  | 'project-not-found'
  | 'asset-not-found'
  | 'invalid-input'
  | 'render-failed'
  | 'render-timeout'
  | 'agent-unavailable'
  | 'agent-failed'
  | 'output-corrupt'
  | 'cancelled'
  | 'missing-config';

export class ComicStudioError extends Error {
  override readonly name = 'ComicStudioError';
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly context: Record<string, unknown> = {},
  ) {
    super(message);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      context: this.context,
    };
  }
}
