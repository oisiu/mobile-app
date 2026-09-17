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
    expect([t('insights'),t('week'),t('month'),t('insightsRankingWeekIntro'),t('insightsRankingIntro'),t('activeDays'),t('total')]).toEqual([title,week,month,weekIntro,monthIntro,activeDays,total]);
  });
});
