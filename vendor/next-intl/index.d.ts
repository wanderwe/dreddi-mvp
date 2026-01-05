import * as React from 'react';

declare interface NextIntlProviderProps {
  locale: string;
  messages?: Record<string, any>;
  children: React.ReactNode;
}

export declare function NextIntlClientProvider(props: NextIntlProviderProps): React.ReactElement;
export declare function useTranslations(namespace?: string): (key: string, params?: Record<string, any>) => string;
export declare function useLocale(): string;
export declare function useMessages<T = Record<string, any>>(): T;
