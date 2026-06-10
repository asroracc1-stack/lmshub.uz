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
