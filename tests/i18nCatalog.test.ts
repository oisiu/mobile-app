import { afterEach, expect, it, vi } from 'vitest';
import { messages } from '../src/i18n/messages/catalog';

const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

it('keeps every translation key and interpolation parameter aligned across supported languages', () => {
  expect(Object.keys(messages.es).sort()).toEqual(Object.keys(messages.en).sort());
  for (const key of Object.keys(messages.en) as (keyof typeof messages.en)[]) {
    expect(messages.en[key].trim(), key).not.toBe('');
    expect(messages.es[key].trim(), key).not.toBe('');
    expect(placeholders(messages.es[key]), key).toEqual(placeholders(messages.en[key]));
  }
});

it.each(['en-US', 'es-ES', 'fr-FR'])(
  'keeps zero interpolation and missing placeholders intact for %s',
  async locale => {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...options, locale });
    const { t, language } = await import('../src/i18n');
    expect(language).toBe(locale === 'es-ES' ? 'es' : 'en');
    expect(t('habitNameCount', { count: 0, limit: 25 })).toBe(
      locale === 'es-ES' ? '0 de 25 caracteres' : '0 of 25 characters',
    );
    expect(t('habitNameCount', { count: 0 })).toContain('{limit}');
    expect(t('habitNameCount')).toContain('{count}');
  },
);
