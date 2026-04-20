export function inputDateValue(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: string, days: number) {
  const date = parseInputDate(value);
  date.setDate(date.getDate() + days);
  return inputDateValue(date);
}

export function weekDateRange(value: string = inputDateValue()) {
  const date = parseInputDate(value);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  const dateFrom = inputDateValue(date);
  const dateTo = addDays(dateFrom, 6);

  return { dateFrom, dateTo };
}
