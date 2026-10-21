// Minimal logger interface, so platform code can log without depending on
// console directly (container.ts provides the implementation).

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: unknown): void;
}
