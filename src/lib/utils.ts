import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isWithinDelta(a: number, b: number, delta: number) {
  return Math.abs(a - b) < delta;
}
