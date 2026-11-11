import { useApp } from '@/features/AppProvider';
import { CalendarEntryModal } from '@/features/insights/CalendarEntryModal';
import { BranchDayDialog } from './BranchDayDialog';
import type { useHomeEntries } from './useHomeEntries';

type Props={editing:ReturnType<typeof useHomeEntries>};
export function HomeEntryDialogs({editing}:Props){
  const {palette:c}=useApp();
  const {branchDialog,dialog}=editing;
  return <>
    {branchDialog&&<BranchDayDialog habit={branchDialog.habit} date={branchDialog.date} onClose={editing.closeBranch}/>}
    {dialog&&<CalendarEntryModal locked={editing.entryNeedsRefresh} editor={dialog} habit={dialog.habit}
      hasRecord={editing.hasRecord} saving={editing.saving} setEditor={editing.updateEditor}
      onSave={editing.save} onClear={editing.clear} c={c}/>}
  </>;
}
