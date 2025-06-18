import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isWithinDelta(a: number, b: number, delta: number) {
  return Math.abs(a - b) < delta;
}

export function formatNumberIT(value: number | string): string {
  value = Number(value);
  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
