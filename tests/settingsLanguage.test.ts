import { afterEach, describe, expect, it, vi } from 'vitest';
import { habitColors } from '../src/domain/habitAppearance';

afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

it.each([
 ['en-US','Tap three times','Hidden habits section enabled below the list.','Hidden habits section hidden.','Leaving this view will not hide it.'],
 ['es-ES','Toca tres veces','Sección de hábitos ocultos activada debajo de la lista.','Sección de hábitos ocultos oculta.','Salir de esta vista no lo ocultará.'],
])('localizes temporary reveals and permanent restoration for %s',async(locale,hint,visible,hidden,restore)=>{
 const options=new Intl.DateTimeFormat().resolvedOptions();
 vi.spyOn(Intl.DateTimeFormat.prototype,'resolvedOptions').mockReturnValue({...options,locale});
 const {t}=await import('../src/i18n');
 expect(t('toggleHiddenCategoriesHint')).toContain(hint);
 expect(t('hiddenCategoriesVisible')).toBe(visible);expect(t('hiddenCategoriesConcealed')).toBe(hidden);
 expect(t('restoreHiddenCategoryHelp')).toContain(restore);
 expect(t('habitSavedRefreshFailed')).toBe(locale==='es-ES'?'Cambios guardados; no se pudo actualizar':'Changes saved; refresh failed');
 expect(t('habitSavedRefreshFailedHelp')).toContain(locale==='es-ES'?'sin guardarlos otra vez':'without saving again');
 expect(t('deletionSummary',{habits:2,entries:3})).toBe(locale==='es-ES'?'Hábitos: 2 · Registros: 3':'Habits: 2 · Records: 3');
 expect(t('habitNameTooLong',{limit:25})).toBe(locale==='es-ES'?'Usa como máximo 25 caracteres para el nombre del hábito.':'Use no more than 25 characters for a habit name.');
 expect(t('archiveWithoutSaving')).toBe(locale==='es-ES'?'Archivar sin guardar':'Archive without saving');
 expect(t('restoreWithoutSaving')).toBe(locale==='es-ES'?'Restaurar sin guardar':'Restore without saving');
 expect(t('habitNameCount',{count:12,limit:25})).toBe(locale==='es-ES'?'12 de 25 caracteres':'12 of 25 characters');
 expect(t('hiddenCategoryRefreshHelp')).toContain(locale==='es-ES'?'sin restaurarlo otra vez':'without restoring it again');
 expect(t('entrySavedRefreshHelp')).toContain(locale==='es-ES'?'sin guardarlos ni moverlos otra vez':'without saving or moving them again');
 expect(t('hideCompletelyHelp')).not.toMatch(/3 seconds|3 segundos/);
});

describe('More language', () => {
  it.each(['es-ES', 'es-MX', 'es-AR'])('uses Spanish throughout More for %s', async locale => {
    const options = new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ ...options, locale });
    const { t } = await import('../src/i18n');
    const { AI_IMPORT_PROMPT } = await import('../src/features/import/aiImportPrompt');
    expect(t('settings')).toBe('Más');
    expect(t('helpAbout')).toBe('Ayuda e información');expect(t('advancedSettings')).toBe('Ajustes avanzados');expect(t('advancedSettingsHelp')).toContain('copia de seguridad');
    expect(t('termsConditions')).toBe('Términos y condiciones');expect(t('privacyPolicy')).toBe('Política de privacidad');expect(t('support')).toBe('Soporte');expect(t('githubRepo')).toBe('Repositorio de GitHub');expect(t('opensBrowser')).toContain('navegador');expect(t('linkFailed')).toBe('No se pudo abrir el enlace');expect(t('linkFailedHelp')).toContain('navegador');
    expect(t('red')).toBe('Rojo');expect(t('yellow')).toBe('Amarillo');expect(t('cyan')).toBe('Celeste');expect(t('lime')).toBe('Verde lima');expect(t('brown')).toBe('Marrón');expect(t('gray')).toBe('Gris');
    expect(t('habitColor')).toBe('Color del hábito');expect(t('automaticColor')).toBe('Automático');expect(t('habitEmoji')).toBe('Emoji del hábito');expect(t('invalidEmoji')).toContain('emoji completo');
    for(const key of ['green','blue','purple','orange','pink','teal','red','yellow','cyan','lime','brown','gray','invalidColor','emojiHelp'] as const)expect(t(key)).toBeTruthy();
    expect(t('openCalendarDay')).toBe('Abrir este día en el calendario ampliado');
    expect(t('editCalendar')).toBe('Editar calendario');
    expect(t('calendarEditHelp')).toContain('Desliza');
    expect(t('exportJson')).toBe('Exportar JSON');expect(t('exportScope')).toBe('Datos que exportar');expect(t('exportAllHabits')).toBe('Todos los hábitos');expect(t('exportArchived')).toBe('Archivada');expect(t('exportScopeHelp')).toContain('todo su historial');
    expect(t('importSummary', { habits: 1, entries: 12 })).toBe('Hábitos: 1. Registros: 12. Se fusionarán los datos nuevos. Los datos existentes nunca se sobrescribirán.');
    expect(t('fileReadFailed')).toBe('No se pudo leer el archivo');
    expect(t('importRejected')).toBe('Importación rechazada');
    expect(t('copyPrompt')).toBe('Copiar instrucciones');
    expect(t('system')).toBe('Sistema');
    expect(AI_IMPORT_PROMPT).toContain('Reglas de conversión:');
    for(const color of habitColors)expect(AI_IMPORT_PROMPT).toContain(`"${color}"`);
    expect(AI_IMPORT_PROMPT).toContain('No inventes');expect(t('deleteDataFinalHelp',{habits:2,entries:3})).toContain('2 hábitos y 3 registros');
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
    expect(t('red')).toBe('Red');expect(t('yellow')).toBe('Yellow');expect(t('cyan')).toBe('Sky blue');expect(t('lime')).toBe('Lime green');expect(t('brown')).toBe('Brown');expect(t('gray')).toBe('Gray');
    expect(t('habitColor')).toBe('Habit color');expect(t('automaticColor')).toBe('Automatic');expect(t('invalidEmoji')).toContain('complete emoji');
    expect(t('exportJson')).toBe('Export JSON');expect(t('exportScope')).toBe('Export scope');expect(t('exportAllHabits')).toBe('All habits');expect(t('exportArchived')).toBe('Archived');expect(t('exportScopeHelp')).toContain('full history');
    expect(t('helpAbout')).toBe('Help & about');expect(t('advancedSettings')).toBe('Advanced settings');expect(t('advancedSettingsHelp')).toContain('backup');
    expect(t('termsConditions')).toBe('Terms and conditions');expect(t('privacyPolicy')).toBe('Privacy policy');expect(t('support')).toBe('Support');expect(t('githubRepo')).toBe('GitHub repository');expect(t('opensBrowser')).toContain('browser');expect(t('linkFailed')).toBe('Could not open link');expect(t('linkFailedHelp')).toContain('browser');
    expect(t('openCalendarDay')).toBe('Open this day in the larger calendar');
    expect(t('editCalendar')).toBe('Edit calendar');
    expect(t('calendarEditHelp')).toContain('Swipe');
    expect(t('importSummary', { habits: 2, entries: 3 })).toContain('Habits: 2. Records: 3.');
    expect(AI_IMPORT_PROMPT).toContain('Conversion rules:');
    expect(t('settings')).toBe('More');for(const color of habitColors)expect(AI_IMPORT_PROMPT).toContain(`"${color}"`);
    expect(AI_IMPORT_PROMPT).toContain('Do not invent');expect(t('deleteDataFinalHelp',{habits:2,entries:3})).toContain('2 habits and 3 records');
    expect(t('habitCreated', { name: '$& {entries}' })).toBe('$& {entries} added');
  });
});
