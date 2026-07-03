import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
  
  // If baseUrl already has /api/v1 and url also starts with /api/v1
  if (url.startsWith('/api/v1') && baseUrl.endsWith('/api/v1')) {
    return baseUrl.replace('/api/v1', '') + url;
  }
  
  // Remove trailing slash from baseUrl and leading slash from url
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  
  return `${cleanBase}/${cleanUrl}`;
}

export const formatPhoneNumber = (value: string): string => {
  if (!value) return "";
  
  // Keep only digits, or '+'
  let cleanValue = value.replace(/[^\d+]/g, "");
  
  // If it's just +, return it
  if (cleanValue === "+") return "+";
  
  let digits = cleanValue.replace(/\D/g, "");
  
  // Prepend 998 if it starts with 9/3/8/7/5 and doesn't already start with 998
  if (digits.length > 0 && !digits.startsWith("998")) {
    const firstTwo = digits.slice(0, 2);
    // Common mobile codes in Uzbekistan: 90, 91, 93, 94, 95, 97, 98, 99, 33, 88, 77, 55, 71, 78
    const uzbCodes = ["90", "91", "93", "94", "95", "97", "98", "99", "33", "88", "77", "55", "71", "78", "20", "70", "72", "73", "74", "75", "76", "79", "61", "62", "65", "66", "67", "69", "50"];
    if (uzbCodes.includes(firstTwo) || (digits.length === 1 && ["9", "3", "8", "7", "5", "2", "6"].includes(digits))) {
      digits = "998" + digits;
    }
  }

  let formatted = "";
  if (digits.length > 0) {
    formatted = "+";
    if (digits.length <= 3) {
      formatted += digits;
    } else if (digits.length <= 5) {
      formatted += `${digits.slice(0, 3)} ${digits.slice(3)}`;
    } else if (digits.length <= 8) {
      formatted += `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
    } else if (digits.length <= 10) {
      formatted += `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    } else {
      formatted += `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
    }
  }
  return formatted;
};
