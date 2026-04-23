import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We test the logger by intercepting console methods.

let loggerModule: typeof import('../logger');

beforeEach(async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('LOG_LEVEL', '');
  vi.resetModules();
  loggerModule = await import('../logger');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('logger (production mode — JSON output)', () => {
  it('outputs JSON for info level', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    loggerModule.logger.info('Server started');
    expect(spy).toHaveBeenCalledOnce();
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.level).toBe('info');
    expect(output.message).toBe('Server started');
    expect(output.timestamp).toBeDefined();
  });

  it('includes context fields in JSON', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    loggerModule.logger.info('Request processed', { userId: 'u1', durationMs: 42 });
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.userId).toBe('u1');
    expect(output.durationMs).toBe(42);
  });

  it('serializes Error objects', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('Connection failed');
    loggerModule.logger.error('DB error', { error: err });
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.error.name).toBe('Error');
    expect(output.error.message).toBe('Connection failed');
  });

  it('skips undefined values in context', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    loggerModule.logger.info('Test', { a: 'yes', b: undefined });
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.a).toBe('yes');
    expect('b' in output).toBe(false);
  });

  it('uses console.error for error level', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loggerModule.logger.error('Failure');
    expect(spy).toHaveBeenCalledOnce();
  });

  it('uses console.warn for warn level', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    loggerModule.logger.warn('Warning');
    expect(spy).toHaveBeenCalledOnce();
  });

  it('uses console.debug for debug level', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    loggerModule.logger.debug('Debug info');
    // In production, default level is info, so debug should be suppressed
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('log levels', () => {
  it('suppresses debug in production (default level = info)', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    loggerModule.logger.debug('Should not appear');
    expect(spy).not.toHaveBeenCalled();
  });

  it('respects LOG_LEVEL=debug', async () => {
    vi.stubEnv('LOG_LEVEL', 'debug');
    vi.resetModules();
    const mod = await import('../logger');
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    mod.logger.debug('Should appear');
    expect(spy).toHaveBeenCalledOnce();
  });

  it('respects LOG_LEVEL=error (suppresses warn and info)', async () => {
    vi.stubEnv('LOG_LEVEL', 'error');
    vi.resetModules();
    const mod = await import('../logger');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mod.logger.info('Suppressed');
    mod.logger.warn('Suppressed');
    mod.logger.error('Visible');

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});

describe('child logger', () => {
  it('inherits parent context', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const child = loggerModule.logger.child({ requestId: 'abc' });
    child.info('Request handled');
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.requestId).toBe('abc');
    expect(output.message).toBe('Request handled');
  });

  it('merges child context with call context', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const child = loggerModule.logger.child({ requestId: 'abc' });
    child.info('Done', { status: 200 });
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.requestId).toBe('abc');
    expect(output.status).toBe(200);
  });

  it('allows nested children', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const child = loggerModule.logger.child({ requestId: 'abc' });
    const grandchild = child.child({ userId: 'u1' });
    grandchild.info('Nested');
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.requestId).toBe('abc');
    expect(output.userId).toBe('u1');
  });
});

describe('createLogger', () => {
  it('adds module field to output', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = loggerModule.createLogger('auth');
    log.info('Login successful');
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.module).toBe('auth');
    expect(output.message).toBe('Login successful');
  });

  it('accepts additional default context', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const log = loggerModule.createLogger('payments', { region: 'us-east' });
    log.info('Payment processed');
    const output = JSON.parse(spy.mock.calls[0][0] as string);
    expect(output.module).toBe('payments');
    expect(output.region).toBe('us-east');
  });
});

describe('development mode', () => {
  it('outputs pretty format (non-JSON)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
    const mod = await import('../logger');
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    mod.logger.info('Dev message');
    const output = spy.mock.calls[0][0] as string;
    // Pretty format contains ANSI codes and is NOT valid JSON
    expect(() => JSON.parse(output)).toThrow();
    expect(output).toContain('Dev message');
    expect(output).toContain('[INFO]');
  });
});
