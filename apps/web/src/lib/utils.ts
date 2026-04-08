import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type WithoutChild<T> = T extends { child?: unknown }
  ? Omit<T, "child">
  : T;
export type WithoutChildren<T> = T extends { children?: unknown }
  ? Omit<T, "children">
  : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};

/** Trims whitespace; returns undefined if the result is empty. */
export function normalizeOptionalString(
  value: string | undefined | null,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** Returns true if field has issues, undefined otherwise (for data-invalid attr). */
export function fieldInvalid(
  issues: readonly unknown[] | undefined | null,
): true | undefined {
  return issues && issues.length > 0 ? true : undefined;
}
