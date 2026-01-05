function createMiddleware({ locales = [], defaultLocale }) {
  return function middleware(request) {
    return { locales, defaultLocale, request };
  };
}

export { createMiddleware };
