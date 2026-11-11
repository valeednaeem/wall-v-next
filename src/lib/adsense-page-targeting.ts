const excludedPaths = ["/dashboard", "/client", "/checkout", "/login", "/signup", "/forgot-password", "/reset-password", "/api"];

export function isExcludedPath(pathname: string): boolean {
  return excludedPaths.some((p) => pathname.startsWith(p));
}

export function shouldLoadAdSense(pathname: string): boolean {
  return !isExcludedPath(pathname);
}
