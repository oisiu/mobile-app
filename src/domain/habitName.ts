export const habitNameLimit=25;

export function habitNameError(name:string,previous?:string):'nameRequired'|'habitNameTooLong'|null{
  const trimmed=name.trim();
  if(!trimmed)return 'nameRequired';
  return Array.from(trimmed).length>habitNameLimit&&trimmed!==previous?.trim()?'habitNameTooLong':null;
}

export function assertHabitName(name:string,previous?:string){
  const error=habitNameError(name,previous);
  if(error)throw new Error(error);
}
