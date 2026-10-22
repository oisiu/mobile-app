import { afterEach,describe,expect,it,vi } from 'vitest';

afterEach(()=>{vi.restoreAllMocks();vi.resetModules()});

describe('Insights overview language',()=>{
  it.each([
    ['en-US','Insights','Week','Month','Top habits ranked by active days this week, through today.','Top habits ranked by active days this month, through today.','Active days','Total'],
    ['es-ES','Análisis','Semana','Mes','Hábitos principales ordenados por días activos de esta semana, hasta hoy.','Hábitos principales ordenados por días activos de este mes, hasta hoy.','Días activos','Total'],
    ['fr-FR','Insights','Week','Month','Top habits ranked by active days this week, through today.','Top habits ranked by active days this month, through today.','Active days','Total'],
  ])('shows matching overview copy for %s',async(locale,title,week,month,weekIntro,monthIntro,activeDays,total)=>{
    const options=new Intl.DateTimeFormat().resolvedOptions();
    vi.spyOn(Intl.DateTimeFormat.prototype,'resolvedOptions').mockReturnValue({...options,locale});
    const {t}=await import('../src/i18n');
    expect(t('quarterShort',{number:1})).toBe('Q1');
    expect(t('historyGrouping')).toBe(locale==='es-ES'?'Agrupación temporal de Historial':'History time grouping');
    expect(t('historyTimeline')).toContain(locale==='es-ES'?'Desliza horizontalmente':'Swipe horizontally');
    expect(t('streaksInfo')).toContain(locale==='es-ES'?'todo el historial':'all recorded history');
    expect(t('frequencyInfo')).toContain(locale==='es-ES'?'Cada columna es un año':'Each column is one year');
    expect(t('frequencyInfo')).not.toContain(locale==='es-ES'?'periodo seleccionado':'selected period');
    expect(t('historyInfo')).toContain(locale==='es-ES'?'ene, abr, jul, oct':'Jan, Apr, Jul, Oct');
    expect(t('year')).toBe(locale==='es-ES'?'Año':'Year');
    expect(t('insightsRankingYearIntro')).toBe(locale==='es-ES'?'Hábitos principales ordenados por días activos de este año, hasta hoy.':'Top habits ranked by active days this year, through today.');
    expect(t('strengthTotal')).toBe(locale==='es-ES'?'Total de días activos':'Total active days');
    expect(t('strengthMonthChange')).toContain('30');
    expect(t('strengthYearChange')).toContain('365');
    expect([t('insights'),t('week'),t('month'),t('insightsRankingWeekIntro'),t('insightsRankingIntro'),t('activeDays'),t('total')]).toEqual([title,week,month,weekIntro,monthIntro,activeDays,total]);
  });
});
