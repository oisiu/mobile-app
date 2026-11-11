export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${date}T12:00:00`),
  );
export const calendarMonthLabel = (date: string, today: string) => {
  const month = new Intl.DateTimeFormat(undefined, { month: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace(/[.\s]/g, '')
    .slice(0, 3);
  const name = month.charAt(0).toLocaleUpperCase() + month.slice(1).toLocaleLowerCase();
  return date.slice(0, 4) === today.slice(0, 4) ? name : `${name} ${date.slice(2, 4)}`;
};
