type OpsInternalContext = {
  request: {
    headers: Record<string, unknown>;
  };
  forbidden: (message?: string) => unknown;
};

/** @returns true when access is allowed */
export function assertOpsInternalAccess(ctx: OpsInternalContext): boolean {
  const expected = process.env.OPS_INTERNAL_SECRET?.trim();

  if (!expected) {
    ctx.forbidden('Ops internal API is not configured.');
    return false;
  }

  const provided = ctx.request.headers['x-ops-internal-secret'];

  if (typeof provided !== 'string' || provided !== expected) {
    ctx.forbidden('Forbidden');
    return false;
  }

  return true;
}
