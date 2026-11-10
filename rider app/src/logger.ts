const noop = (): void => undefined;

export const logger = __DEV__
  ? {
      debug: (...args: unknown[]): void => {
        console.debug('[swiftlogix]', ...args);
      },
      warn: (...args: unknown[]): void => {
        console.warn('[swiftlogix]', ...args);
      },
      error: (...args: unknown[]): void => {
        console.error('[swiftlogix]', ...args);
      },
    }
  : { debug: noop, warn: noop, error: noop };
