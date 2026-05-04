/**
 * Calendar-style week within a month (not ISO week):
 * week 1 = days 1–7, week 2 = 8–14, week 3 = 15–21, week 4 = remaining days.
 */
export function calendarWeekFromDayOfMonth(dayOfMonth: number): 1 | 2 | 3 | 4 {
  if (dayOfMonth <= 7) return 1;
  if (dayOfMonth <= 14) return 2;
  if (dayOfMonth <= 21) return 3;
  return 4;
}

export function defaultMedicalMonthWeek(reference = new Date()) {
  return {
    month: reference.getMonth() + 1,
    week: calendarWeekFromDayOfMonth(reference.getDate()),
  };
}

function parseBoundedIntParam(
  value: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === undefined || value === "") {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function resolveMedicalMonthFilter(
  queryValue: string | undefined,
  fallback: number,
): number {
  return parseBoundedIntParam(queryValue, 1, 12, fallback);
}

export function resolveMedicalWeekFilter(
  queryValue: string | undefined,
  fallback: number,
): number {
  return parseBoundedIntParam(queryValue, 1, 4, fallback);
}
