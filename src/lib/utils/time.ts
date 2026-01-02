import { DateTime, IANAZone } from "luxon";

export const isValidTimeZone = (timeZone: string): boolean =>
  IANAZone.isValidZone(timeZone);

export const parseDateTimeInZone = (
  value: string,
  timeZone: string,
): Date | null => {
  const zone = IANAZone.create(timeZone);
  if (!zone?.isValid) return null;

  const dt = DateTime.fromISO(value.trim(), { zone });
  if (!dt.isValid) return null;

  return dt.toJSDate();
};
