import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | undefined | null, currency: string = 'INR'): string {
  const numeric = typeof amount === 'number' && !isNaN(amount) ? amount : (Number(amount) || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatNumber(num: number | string | undefined | null): string {
  const numeric = typeof num === 'number' && !isNaN(num) ? num : (Number(num) || 0);
  return new Intl.NumberFormat('en-IN').format(numeric);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// -----------------------------------------------------------------------------
// Employee IDs — sequential: EMP-100, EMP-101, EMP-102, ...
// -----------------------------------------------------------------------------
export const EMPLOYEE_ID_PREFIX = 'EMP-';
export const EMPLOYEE_ID_START = 100;
/** Legacy random IDs were 6 digits (e.g. EMP-482913); they are ignored when finding the next number. */
const EMPLOYEE_ID_SEQUENCE_CEILING = 100000;

/** Returns the sequence number of an ID like "EMP-104", or null if it is not a sequential ID. */
export function parseEmployeeNumber(id: string | null | undefined): number | null {
  if (!id) return null;
  const match = /^EMP-?([1-9]\d*)$/i.exec(id.trim());
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return n >= EMPLOYEE_ID_START && n < EMPLOYEE_ID_SEQUENCE_CEILING ? n : null;
}

/** Formats a sequence number as an employee ID, e.g. 100 -> "EMP-100". */
export function formatEmployeeId(n: number): string {
  return `${EMPLOYEE_ID_PREFIX}${n}`;
}

/** Next free sequential employee ID given the IDs already in use (starts at EMP-100). */
export function nextEmployeeId(existingIds: Iterable<string | null | undefined>): string {
  let max = EMPLOYEE_ID_START - 1;
  for (const id of existingIds) {
    const n = parseEmployeeNumber(id);
    if (n !== null && n > max) max = n;
  }
  return formatEmployeeId(max + 1);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function dateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getMonthStart(date: Date = new Date()): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

export function getMonthEnd(date: Date = new Date()): string {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
}

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function downloadCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? '' : String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
