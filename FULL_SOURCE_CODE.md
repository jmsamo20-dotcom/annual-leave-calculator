# 연차계산기 전체 소스코드

## 1. src/main.tsx
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## 2. src/index.css
```css
:root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color: #213547;
  background-color: #f5f5f5;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  transition: background-color 0.2s, color 0.2s;
}

:root.dark {
  color: #e2e8f0;
  background-color: #0f172a;
  color-scheme: dark;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  max-width: 100%;
}

h1, h2, h3 {
  margin: 0;
}

input {
  font-family: inherit;
}
```

## 3. src/lib/calc/types.ts
```ts
/**
 * 연차 계산기 타입 정의
 * 내부 계산 단위: 시간(hours)
 */

/** 계산 모드 */
export type CalcMode = 'AUTO_TOTAL' | 'YEAR_REMAIN';

/** 사용 연차 태그 (UI용) */
export type UsageTag = 'FULL_DAY' | 'AM_HALF' | 'PM_HALF' | 'HOUR' | 'CUSTOM';

/** 사용 연차 내역 항목 */
export interface UsageRecord {
  id: string;
  date: string; // YYYY-MM-DD
  amountHours: number; // 정수
  memo: string;
  tag?: UsageTag;
}

/** 정책 설정 타입 */
export interface PolicyConfig {
  type: 'DEFAULT' | string;
}

/** 계산 입력 타입 (AUTO_TOTAL 모드) */
export interface CalculationInput {
  hireDate: string; // YYYY-MM-DD
  asOfDate: string; // YYYY-MM-DD
  workHoursPerDay: number;
  usedHoursTotal?: number;
  usageRecords?: UsageRecord[];
  policyConfig: PolicyConfig;
}

/** 연도별 잔여 연차 입력 타입 (YEAR_REMAIN 모드) */
export interface YearRemainInput {
  year: number;
  hireDate: string;
  carryDays: number;
  workHoursPerDay: number;
  annualLeaveRecords: AnnualLeaveRecord[];
  policyConfig: PolicyConfig;
}

/** 근속기간 타입 */
export interface ServicePeriod {
  years: number;
  months: number;
  totalMonths: number;
}

/** 계산 결과 타입 (AUTO_TOTAL 모드) */
export interface CalculationResult {
  servicePeriod: ServicePeriod;
  accruedHoursTotal: number;
  usedHoursTotal: number;
  remainingHours: number;
  accruedDaysTotal: number;
  usedDaysTotal: number;
  remainingDays: number;
  accruedPretty: string;
  usedPretty: string;
  remainingPretty: string;
}

/** 연도별 잔여 연차 결과 타입 (YEAR_REMAIN 모드) */
export interface YearRemainResult {
  year: number;
  tenureYears: number;
  yearlyGrantDays: number;
  yearlyGrantHours: number;
  carryDays: number;
  carryHours: number;
  availableDays: number;
  availableHours: number;
  usedDays: number;
  usedHours: number;
  remainingDays: number;
  remainingHours: number;
  yearlyGrantPretty: string;
  carryPretty: string;
  availablePretty: string;
  usedPretty: string;
  remainingPretty: string;
}

/** 유효성 검사 결과 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/** YEAR_REMAIN 모드 localStorage 저장 데이터 */
export interface YearRemainStorageData {
  year: number;
  carryDays: number;
  usageRecords: UsageRecord[];
}

/** 사용 연차 프리셋 타입 */
export type UsagePreset = '1H' | '2H' | '3H' | 'AM_HALF' | 'PM_HALF' | 'FULL_DAY' | 'CUSTOM';

/** 휴가 유형 */
export type LeaveType = 'ANNUAL' | 'EVENT';

/** 연차 휴가 기록 (시간 단위) */
export interface AnnualLeaveRecord {
  id: string;
  type: 'ANNUAL';
  date: string;
  amountHours: number;
  memo: string;
}

/** 경조휴가 기록 (일 단위) */
export interface EventLeaveRecord {
  id: string;
  type: 'EVENT';
  date: string;
  eventType: EventLeaveType;
  title: string;
  calendarDays: number;
  workingDays: number;
  memo: string;
}

/** 경조휴가 유형 */
export type EventLeaveType =
  | 'MARRIAGE_SELF'
  | 'MARRIAGE_CHILD'
  | 'MARRIAGE_SIBLING'
  | 'DEATH_SPOUSE'
  | 'DEATH_PARENT'
  | 'DEATH_CHILD'
  | 'DEATH_SIBLING'
  | 'DEATH_GRANDPARENT';

/** 경조휴가 정책 정의 */
export interface EventLeavePolicy {
  type: EventLeaveType;
  category: 'MARRIAGE' | 'DEATH';
  title: string;
  calendarDays: number;
  note?: string;
}

/** 통합 저장 데이터 (YEAR_REMAIN 모드) */
export interface YearStateData {
  year: number;
  hireDate: string;
  carryDays: number;
  annualLeaveRecords: AnnualLeaveRecord[];
  eventLeaveRecords: EventLeaveRecord[];
}
```

## 4. src/lib/calc/constants.ts
```ts
/**
 * 연차 계산기 상수
 */

import type { EventLeavePolicy } from './types';

/** 1일 근로시간 (고정) */
export const WORK_HOURS_PER_DAY = 8;

/** 반차 시간 */
export const HALF_DAY_HOURS = WORK_HOURS_PER_DAY / 2;

/**
 * 경조휴가 정책 목록
 */
export const EVENT_LEAVE_POLICIES: EventLeavePolicy[] = [
  { type: 'MARRIAGE_SELF', category: 'MARRIAGE', title: '결혼(본인)', calendarDays: 7, note: '휴일 포함' },
  { type: 'MARRIAGE_CHILD', category: 'MARRIAGE', title: '결혼(자녀)', calendarDays: 1, note: '휴일 포함' },
  { type: 'MARRIAGE_SIBLING', category: 'MARRIAGE', title: '결혼(형제/자매)', calendarDays: 1, note: '휴일 포함' },
  { type: 'DEATH_SPOUSE', category: 'DEATH', title: '사망(배우자)', calendarDays: 5, note: '휴일 포함' },
  { type: 'DEATH_PARENT', category: 'DEATH', title: '사망(부모)', calendarDays: 5, note: '휴일 포함' },
  { type: 'DEATH_CHILD', category: 'DEATH', title: '사망(자녀)', calendarDays: 3, note: '휴일 포함' },
  { type: 'DEATH_SIBLING', category: 'DEATH', title: '사망(형제/자매)', calendarDays: 3, note: '휴일 포함' },
  { type: 'DEATH_GRANDPARENT', category: 'DEATH', title: '사망(조부모/외조부모)', calendarDays: 3, note: '휴일 포함' },
];

export const MARRIAGE_POLICIES = EVENT_LEAVE_POLICIES.filter(p => p.category === 'MARRIAGE');
export const DEATH_POLICIES = EVENT_LEAVE_POLICIES.filter(p => p.category === 'DEATH');

export function getEventLeavePolicy(type: string): EventLeavePolicy | undefined {
  return EVENT_LEAVE_POLICIES.find(p => p.type === type);
}
```

## 5. src/lib/calc/dateUtils.ts
```ts
/**
 * 날짜 유틸리티 함수
 */

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const date = parseDate(dateStr);
  return !isNaN(date.getTime()) && formatDate(date) === dateStr;
}

export function calculateServicePeriod(
  hireDate: string,
  asOfDate: string
): { years: number; months: number; totalMonths: number } {
  const hire = parseDate(hireDate);
  const asOf = parseDate(asOfDate);

  let years = asOf.getUTCFullYear() - hire.getUTCFullYear();
  let months = asOf.getUTCMonth() - hire.getUTCMonth();

  if (asOf.getUTCDate() < hire.getUTCDate()) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = years * 12 + months;

  return { years, months, totalMonths };
}

export function isBefore(date1: string, date2: string): boolean {
  return parseDate(date1).getTime() < parseDate(date2).getTime();
}

export function isAfter(date1: string, date2: string): boolean {
  return parseDate(date1).getTime() > parseDate(date2).getTime();
}

export function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/[-/.\s]+/);
  if (parts.length !== 3) return null;

  const [yearStr, monthStr, dayStr] = parts;

  if (!/^\d{4}$/.test(yearStr)) return null;
  const year = parseInt(yearStr, 10);

  if (!/^\d{1,2}$/.test(monthStr)) return null;
  const month = parseInt(monthStr, 10);
  if (month < 1 || month > 12) return null;

  if (!/^\d{1,2}$/.test(dayStr)) return null;
  const day = parseInt(dayStr, 10);
  if (day < 1 || day > 31) return null;

  const normalized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  if (!isValidDateString(normalized)) return null;

  return normalized;
}
```

## 6. src/lib/calc/formatters.ts
```ts
/**
 * 포맷터 유틸리티 함수
 */

import type { UsagePreset } from './types';

export function formatHoursAsDaysHours(
  hours: number,
  workHoursPerDay: number
): string {
  const sign = hours < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(hours));
  const days = Math.floor(abs / workHoursPerDay);
  const remH = abs % workHoursPerDay;

  if (days === 0 && remH === 0) {
    return '0일 0시간';
  }
  if (days === 0) {
    return `${sign}${remH}시간`;
  }
  if (remH === 0) {
    return `${sign}${days}일`;
  }
  return `${sign}${days}일 ${remH}시간`;
}

export function daysToHours(days: number, workHoursPerDay: number): number {
  return days * workHoursPerDay;
}

export function hoursToDays(hours: number, workHoursPerDay: number): number {
  return hours / workHoursPerDay;
}

export function isValidDaysInput(
  days: number,
  workHoursPerDay: number
): boolean {
  const hours = daysToHours(days, workHoursPerDay);
  return Number.isInteger(hours) && hours >= 0;
}

export function presetToHours(
  preset: UsagePreset,
  workHoursPerDay: number
): number {
  switch (preset) {
    case '1H':
      return 1;
    case '2H':
      return 2;
    case '3H':
      return 3;
    case 'AM_HALF':
    case 'PM_HALF':
      return Math.floor(workHoursPerDay / 2);
    case 'FULL_DAY':
      return workHoursPerDay;
    case 'CUSTOM':
      return 0;
  }
}

export function getPresetMemo(preset: UsagePreset): string {
  switch (preset) {
    case '1H':
      return '1시간';
    case '2H':
      return '2시간';
    case '3H':
      return '3시간';
    case 'AM_HALF':
      return '오전반차';
    case 'PM_HALF':
      return '오후반차';
    case 'FULL_DAY':
      return '연차';
    case 'CUSTOM':
      return '';
  }
}

export function getLeaveTypeLabel(amountHours: number, workHoursPerDay: number = 8): string {
  const halfDayHours = workHoursPerDay / 2;

  if (amountHours === workHoursPerDay) {
    return '연차(1일)';
  }
  if (amountHours === halfDayHours) {
    return '반차(4hr)';
  }
  if (amountHours === 1) {
    return '시간연차(1h)';
  }
  if (amountHours === 2) {
    return '시간연차(2h)';
  }
  if (amountHours === 3) {
    return '시간연차(3h)';
  }
  return `${amountHours}시간`;
}
```
