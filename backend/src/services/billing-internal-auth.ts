type BillingInternalContext = {
  request: {
    headers: Record<string, unknown>;
  };
  forbidden: (message?: string) => unknown;
};

/** @returns true when access is allowed */
export function assertBillingInternalAccess(ctx: BillingInternalContext): boolean {
  const expected = process.env.BILLING_INTERNAL_SECRET?.trim();

  if (!expected) {
    ctx.forbidden('Billing internal API is not configured.');
    return false;
  }

  const provided = ctx.request.headers['x-billing-internal-secret'];

  if (typeof provided !== 'string' || provided !== expected) {
    ctx.forbidden('Forbidden');
    return false;
  }

  return true;
}
