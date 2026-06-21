export function isOpsApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/ops');
}

export function isOpsPagePath(pathname: string): boolean {
  return pathname === '/ops' || pathname.startsWith('/ops/');
}
