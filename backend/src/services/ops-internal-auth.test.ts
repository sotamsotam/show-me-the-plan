import { describe, expect, it } from 'vitest';
import { assertOpsInternalAccess } from './ops-internal-auth';

function createCtx(headers: Record<string, unknown> = {}) {
  let status = 200;
  return {
    request: { headers },
    forbidden(message?: string) {
      status = 403;
      return { message };
    },
    get status() {
      return status;
    },
  };
}

describe('assertOpsInternalAccess', () => {
  it('denies when secret is not configured', () => {
    const previous = process.env.OPS_INTERNAL_SECRET;
    delete process.env.OPS_INTERNAL_SECRET;

    const ctx = createCtx();
    expect(assertOpsInternalAccess(ctx as never)).toBe(false);
    expect(ctx.status).toBe(403);

    if (previous) {
      process.env.OPS_INTERNAL_SECRET = previous;
    }
  });

  it('denies when header is missing or wrong', () => {
    const previous = process.env.OPS_INTERNAL_SECRET;
    process.env.OPS_INTERNAL_SECRET = 'test-secret';

    const missing = createCtx();
    expect(assertOpsInternalAccess(missing as never)).toBe(false);
    expect(missing.status).toBe(403);

    const wrong = createCtx({ 'x-ops-internal-secret': 'nope' });
    expect(assertOpsInternalAccess(wrong as never)).toBe(false);
    expect(wrong.status).toBe(403);

    if (previous) {
      process.env.OPS_INTERNAL_SECRET = previous;
    } else {
      delete process.env.OPS_INTERNAL_SECRET;
    }
  });

  it('allows when header matches', () => {
    const previous = process.env.OPS_INTERNAL_SECRET;
    process.env.OPS_INTERNAL_SECRET = 'test-secret';

    const ctx = createCtx({ 'x-ops-internal-secret': 'test-secret' });
    expect(assertOpsInternalAccess(ctx as never)).toBe(true);
    expect(ctx.status).toBe(200);

    if (previous) {
      process.env.OPS_INTERNAL_SECRET = previous;
    } else {
      delete process.env.OPS_INTERNAL_SECRET;
    }
  });
});
