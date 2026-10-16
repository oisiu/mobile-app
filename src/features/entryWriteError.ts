import { t } from '@/i18n';

export class EntryRefreshError extends Error{
  constructor(){super(t('entrySavedRefreshHelp'));this.name='EntryRefreshError'}
}

export function entryErrorTitle(error:unknown){
  return t(error instanceof EntryRefreshError?'habitSavedRefreshFailed':'couldNotSave');
}
