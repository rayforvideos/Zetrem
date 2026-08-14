import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** shadcn 의 클래스 합치기. 뒤에 온 유틸리티가 앞의 것을 이긴다 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
