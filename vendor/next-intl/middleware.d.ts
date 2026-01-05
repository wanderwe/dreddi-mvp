import type { NextRequest, NextResponse } from 'next/server';

type MiddlewareConfig = {
  locales: string[];
  defaultLocale: string;
};

export declare function createMiddleware(config: MiddlewareConfig): (request: NextRequest) => NextResponse | any;
