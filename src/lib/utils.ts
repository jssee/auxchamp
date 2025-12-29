import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as v from "valibot";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Form coercion: HTML forms send strings, this converts to boolean
// Treats "true" or "on" (default checkbox value) as true, everything else as false
export const booleanFromForm = v.pipe(
  v.optional(v.string()),
  v.transform((val) => val === "true" || val === "on"),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
  ? Omit<T, "children">
  : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null;
};
