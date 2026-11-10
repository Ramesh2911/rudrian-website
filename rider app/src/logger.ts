const noop = (): void => undefined;

export const logger = __DEV__
  ? {
      debug: (...args: unknown[]): void => {
        console.debug('[rudrian-rider]', ...args);
      },
      warn: (...args: unknown[]): void => {
        console.warn('[rudrian-rider]', ...args);
      },
      error: (...args: unknown[]): void => {
        console.error('[rudrian-rider]', ...args);
      },
    }
  : { debug: noop, warn: noop, error: noop };
