import { describe,expect,it } from 'vitest';
import { assertHabitAppearance,habitColors,inheritedHabitColor,isHabitColor,isSingleEmoji } from '../src/domain/habitAppearance';
import { habitAccent,habitColorPalette } from '../src/theme/habitColors';
import { Habit } from '../src/domain/types';
const h=(id:string,parentId:string|null=null,color?:Habit['color']):Habit=>({id,parentId,color,name:id,emoji:'',type:'boolean',sortOrder:0,isGeneral:false,archivedAt:null,createdAt:'',updatedAt:''});
describe('Habit appearance',()=>{
  it.each(['','✨','👍🏽','🇪🇸','👨‍👩‍👧‍👦','❤️','1️⃣','🏳️‍🌈','👩🏽‍💻','🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'])('accepts one complete emoji %s',emoji=>expect(isSingleEmoji(emoji)).toBe(true));
  it.each(['✨✨','👍🏽🇪🇸','hi','1','🇪','🏽','👨‍','🙂 text',' 🙂','🙂\n'])('rejects multiple or incomplete emoji %s',emoji=>expect(isSingleEmoji(emoji)).toBe(false));
  it('validates palette choices and empty defaults',()=>{
    for(const color of habitColors){expect(isHabitColor(color)).toBe(true);expect(()=>assertHabitAppearance('✨',color)).not.toThrow()}
    expect(()=>assertHabitAppearance('',null)).not.toThrow();expect(()=>assertHabitAppearance('',undefined)).not.toThrow();
    expect(()=>assertHabitAppearance('✨✨',null)).toThrow('INVALID_EMOJI');expect(()=>assertHabitAppearance('✨','#fff')).toThrow('INVALID_COLOR');expect(isHabitColor(2)).toBe(false);
  });
  it('resolves overrides, inheritance, reset, defaults, orphans and cycles',()=>{
    const root=h('root',null,'blue'),child=h('child','root'),grandchild=h('grandchild','child','pink'),habits=[root,child,grandchild];
    expect(inheritedHabitColor(child,habits)).toBe('blue');expect(inheritedHabitColor(grandchild,habits)).toBe('pink');
    expect(inheritedHabitColor({...grandchild,color:null},habits)).toBe('blue');expect(habitAccent(child,habits,'fallback')).toBe(habitColorPalette.blue);
    expect(habitAccent(h('plain'),[],'fallback')).toBe('fallback');expect(inheritedHabitColor(h('orphan','missing'),[])).toBeNull();
    const a=h('a','b'),b=h('b','a');expect(inheritedHabitColor(a,[a,b])).toBeNull();
  });
});
