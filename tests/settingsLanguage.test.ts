import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

describe('Settings language', () => {
  it.each(['es-ES', 'es-MX', 'es-AR'])('uses Spanish throughout Settings for %s', async locale => {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...options, locale });
    const { t } = await import('../src/i18n');
    const { AI_IMPORT_PROMPT } = await import('../src/features/import/aiImportPrompt');
    expect(t('settings')).toBe('Ajustes');
    expect(t('openCalendarDay')).toBe('Abrir este día en el calendario ampliado');
    expect(t('editCalendar')).toBe('Editar calendario');
    expect(t('calendarEditHelp')).toContain('Desliza');
    expect(t('exportJson')).toBe('Exportar JSON completo');
    expect(t('importSummary', { habits: 1, entries: 12 })).toBe('Hábitos: 1. Registros: 12. Se fusionarán los datos nuevos. Los datos existentes nunca se sobrescribirán.');
    expect(t('fileReadFailed')).toBe('No se pudo leer el archivo');
    expect(t('importRejected')).toBe('Importación rechazada');
    expect(t('copyPrompt')).toBe('Copiar instrucciones');
    expect(t('system')).toBe('Sistema');
    expect(AI_IMPORT_PROMPT).toContain('Reglas de conversión:');
    const example = JSON.parse(AI_IMPORT_PROMPT.slice(AI_IMPORT_PROMPT.indexOf('{'), AI_IMPORT_PROMPT.lastIndexOf('}') + 1));
    expect(example.version).toBe(1);
    expect(example.habits[0].type).toBe('boolean');
    expect(example.entries[0].habitId).toBe(example.habits[0].id);
  });

  it.each(['en-US', 'fr-FR'])('uses the English fallback for %s', async locale => {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...options, locale });
    const { t } = await import('../src/i18n');
    const { AI_IMPORT_PROMPT } = await import('../src/features/import/aiImportPrompt');
    expect(t('exportJson')).toBe('Export complete JSON');
    expect(t('openCalendarDay')).toBe('Open this day in the larger calendar');
    expect(t('editCalendar')).toBe('Edit calendar');
    expect(t('calendarEditHelp')).toContain('Swipe');
    expect(t('importSummary', { habits: 2, entries: 3 })).toContain('Habits: 2. Records: 3.');
    expect(AI_IMPORT_PROMPT).toContain('Conversion rules:');
    expect(t('habitCreated', { name: '$& {entries}' })).toBe('$& {entries} added');
  });
});
