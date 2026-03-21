/**
 * ZoCW Internationalization (i18n) Scaffold
 *
 * BRD Requirement: ZCW-BRD-0261
 * Supported locales: en-US, es-ES, fr-FR, de-DE, pt-BR, zh-CN
 *
 * This scaffold provides:
 * - Locale type definitions
 * - Date/number formatting utilities using Intl API
 * - Translation key type safety
 * - Context provider for React components
 */

import { createContext, useContext, useState, ReactNode } from 'react';

export type SupportedLocale = 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'pt-BR' | 'zh-CN';

export const SUPPORTED_LOCALES: Record<SupportedLocale, string> = {
  'en-US': 'English (US)',
  'es-ES': 'Español',
  'fr-FR': 'Français',
  'de-DE': 'Deutsch',
  'pt-BR': 'Português (BR)',
  'zh-CN': '中文 (简体)',
};

export const DEFAULT_LOCALE: SupportedLocale = 'en-US';

/**
 * Format a date according to the current locale
 */
export function formatDate(date: Date | string, locale: SupportedLocale, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = style === 'short'
    ? { month: 'numeric', day: 'numeric', year: '2-digit' }
    : style === 'long'
    ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' };
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Format a number according to the current locale
 */
export function formatNumber(value: number, locale: SupportedLocale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a percentage
 */
export function formatPercent(value: number, locale: SupportedLocale, decimals: number = 1): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Translation key namespace (extend per screen/component)
 * Firebase Studio should expand these with actual translation strings
 */
export interface TranslationKeys {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    create: string;
    search: string;
    filter: string;
    export: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    close: string;
    yes: string;
    no: string;
  };
  auth: {
    signIn: string;
    signOut: string;
    unauthorized: string;
    sessionExpired: string;
  };
  procedure: {
    status: Record<string, string>;
    studyType: Record<string, string>;
  };
  navigation: {
    dashboard: string;
    patients: string;
    procedures: string;
    reports: string;
    education: string;
    admin: string;
    worklist: string;
    operations: string;
    analytics: string;
  };
}

// English translations (default)
const en_US: TranslationKeys = {
  common: {
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    create: 'Create', search: 'Search', filter: 'Filter', export: 'Export',
    loading: 'Loading...', error: 'An error occurred', success: 'Success',
    confirm: 'Confirm', back: 'Back', next: 'Next', previous: 'Previous',
    submit: 'Submit', close: 'Close', yes: 'Yes', no: 'No',
  },
  auth: {
    signIn: 'Sign In', signOut: 'Sign Out',
    unauthorized: 'You do not have permission to view this page.',
    sessionExpired: 'Your session has expired. Please sign in again.',
  },
  procedure: {
    status: {
      capsule_return_pending: 'Capsule Return Pending',
      capsule_received: 'Capsule Received',
      ready_for_review: 'Ready for Review',
      draft: 'Draft',
      appended_draft: 'Appended Draft',
      completed: 'Completed',
      completed_appended: 'Completed (Appended)',
      closed: 'Closed',
      void: 'Void',
    },
    studyType: {
      upper_gi_eval: 'Upper GI Evaluation',
      sb_diagnostic: 'Small Bowel Diagnostic',
      crohns_monitor: "Crohn's Monitoring",
      colon_eval: 'Colon Evaluation',
    },
  },
  navigation: {
    dashboard: 'Dashboard', patients: 'Patients', procedures: 'Procedures',
    reports: 'Reports & Analytics', education: 'Education Library',
    admin: 'Administration', worklist: 'My Worklist',
    operations: 'Operations', analytics: 'Analytics',
  },
};

// Translations registry (Firebase Studio should generate other locales)
const translations: Partial<Record<SupportedLocale, TranslationKeys>> = {
  'en-US': en_US,
  // FIREBASE: Generate translations for es-ES, fr-FR, de-DE, pt-BR, zh-CN
};

/**
 * Get translation for a key path
 */
export function t(locale: SupportedLocale, keyPath: string): string {
  const trans = translations[locale] || translations[DEFAULT_LOCALE]!;
  const keys = keyPath.split('.');
  let result: any = trans;
  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) break;
  }
  return typeof result === 'string' ? result : keyPath;
}

// React Context
interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (keyPath: string) => string;
  formatDate: (date: Date | string, style?: 'short' | 'medium' | 'long') => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, decimals?: number) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<SupportedLocale>(DEFAULT_LOCALE);

  const value: I18nContextType = {
    locale,
    setLocale,
    t: (keyPath: string) => t(locale, keyPath),
    formatDate: (date, style) => formatDate(date, locale, style),
    formatNumber: (value, options) => formatNumber(value, locale, options),
    formatPercent: (value, decimals) => formatPercent(value, locale, decimals),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
