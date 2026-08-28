import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** XSS oldini olish uchun foydalanuvchi kiritgan matnni tozalash. */
export function sanitizeInput(input: string, maxLength = 128): string {
  return input
    .replace(/[<>"']/g, "")
    .replace(/&/g, "&amp;")
    .slice(0, maxLength)
    .trim();
}
