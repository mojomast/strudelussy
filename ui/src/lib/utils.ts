import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createId(prefix?: string) {
  const cryptoObject = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined

  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    const value = cryptoObject.randomUUID()
    return prefix ? `${prefix}-${value}` : value
  }

  const fallback = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return prefix ? `${prefix}-${fallback}` : fallback
}
