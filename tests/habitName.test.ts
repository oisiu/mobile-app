import { expect,it } from 'vitest';
import { assertHabitName,habitNameError,habitNameLimit } from '../src/domain/habitName';

it('requires a name and limits new names to 25 Unicode code points after trimming',()=>{
 expect(habitNameLimit).toBe(25);
 for(const name of ['','   ','\n'])expect(habitNameError(name)).toBe('nameRequired');
 expect(habitNameError('  '+'a'.repeat(25)+'  ')).toBeNull();
 expect(habitNameError('a'.repeat(26))).toBe('habitNameTooLong');
 expect(habitNameError('🌱'.repeat(25))).toBeNull();expect(habitNameError('🌱'.repeat(26))).toBe('habitNameTooLong');
 expect(()=>assertHabitName('')).toThrow('nameRequired');expect(()=>assertHabitName('a'.repeat(26))).toThrow('habitNameTooLong');
});
it('preserves unchanged legacy names while requiring renamed habits to meet the limit',()=>{
 const legacy='a'.repeat(60);
 expect(habitNameError(legacy,legacy)).toBeNull();expect(()=>assertHabitName(legacy,legacy)).not.toThrow();
 expect(habitNameError(legacy+'b',legacy)).toBe('habitNameTooLong');
 expect(habitNameError('Short name',legacy)).toBeNull();
});
