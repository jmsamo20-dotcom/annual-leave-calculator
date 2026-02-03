# 연차계산기 전체 소스코드 (Part 2)

## 7. src/lib/calc/workingDays.ts
```ts
/**
 * 근무일 계산 유틸리티
 */

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isHoliday(dateStr: string, holidays: Set<string>): boolean {
  return holidays.has(dateStr);
}

export function getDateRange(startDateStr: string, calendarDays: number): string[] {
  const dates: string[] = [];
  const startDate = parseLocalDate(startDateStr);

  for (let i = 0; i < calendarDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    dates.push(formatDateToYYYYMMDD(currentDate));
  }

  return dates;
}

export function calculateWorkingDays(
  startDateStr: string,
  calendarDays: number,
  holidays: Set<string>
): number {
  const dateRange = getDateRange(startDateStr, calendarDays);

  let workingDays = 0;

  for (const dateStr of dateRange) {
    const date = parseLocalDate(dateStr);
    if (!isWeekend(date) && !isHoliday(dateStr, holidays)) {
      workingDays++;
    }
  }

  return workingDays;
}

export interface WorkingDaysResult {
  calendarDays: number;
  workingDays: number;
  weekendDays: number;
  holidayDays: number;
  dateRange: string[];
}

export function calculateWorkingDaysDetailed(
  startDateStr: string,
  calendarDays: number,
  holidays: Set<string>
): WorkingDaysResult {
  const dateRange = getDateRange(startDateStr, calendarDays);

  let workingDays = 0;
  let weekendDays = 0;
  let holidayDays = 0;

  for (const dateStr of dateRange) {
    const date = parseLocalDate(dateStr);
    const weekend = isWeekend(date);
    const holiday = isHoliday(dateStr, holidays);

    if (weekend) {
      weekendDays++;
    } else if (holiday) {
      holidayDays++;
    } else {
      workingDays++;
    }
  }

  return {
    calendarDays,
    workingDays,
    weekendDays,
    holidayDays,
    dateRange,
  };
}

export function getEndDate(startDateStr: string, calendarDays: number): string {
  const startDate = parseLocalDate(startDateStr);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + calendarDays - 1);
  return formatDateToYYYYMMDD(endDate);
}
```

## 8. src/lib/calc/policies/default.ts
```ts
/**
 * DEFAULT 정책: 기본 연차 발생 계산
 */

import { calculateServicePeriod, parseDate } from '../dateUtils';

export interface DefaultPolicyOptions {}

export function getYearlyDays(y: number): number {
  if (y < 1) return 0;
  return Math.min(15 + Math.floor((y - 1) / 2), 25);
}

export function calculateDefaultAccruedDays(
  hireDate: string,
  asOfDate: string,
  _options?: DefaultPolicyOptions
): number {
  const { years, totalMonths } = calculateServicePeriod(hireDate, asOfDate);
  const hire = parseDate(hireDate);
  const asOf = parseDate(asOfDate);

  if (asOf.getTime() < hire.getTime()) {
    return 0;
  }

  if (years < 1) {
    return Math.min(totalMonths, 11);
  }

  let accrued = 11;

  for (let y = 1; y <= years; y++) {
    accrued += getYearlyDays(y);
  }

  return accrued;
}
```

## 9. src/lib/calc/policyEngine.ts
```ts
/**
 * 정책 엔진
 */

import type { PolicyConfig } from './types';
import { calculateDefaultAccruedDays, getYearlyDays } from './policies/default';

export { getYearlyDays };

type PolicyCalculator = (
  hireDate: string,
  asOfDate: string,
  config: PolicyConfig
) => number;

const policyRegistry: Record<string, PolicyCalculator> = {
  DEFAULT: (hireDate, asOfDate, _config) => {
    return calculateDefaultAccruedDays(hireDate, asOfDate);
  },
};

export function getAccruedDays(
  hireDate: string,
  asOfDate: string,
  policyConfig: PolicyConfig
): number {
  const calculator = policyRegistry[policyConfig.type];

  if (!calculator) {
    console.warn(
      `Unknown policy type: ${policyConfig.type}, falling back to DEFAULT`
    );
    return policyRegistry.DEFAULT(hireDate, asOfDate, policyConfig);
  }

  return calculator(hireDate, asOfDate, policyConfig);
}

export function getAvailablePolicies(): string[] {
  return Object.keys(policyRegistry);
}

export function registerPolicy(
  name: string,
  calculator: PolicyCalculator
): void {
  policyRegistry[name] = calculator;
}
```

## 10. src/lib/calc/index.ts
```ts
/**
 * 연차 계산기 핵심 모듈
 */

export * from './types';
export * from './dateUtils';
export * from './policyEngine';
export * from './formatters';
export * from './constants';
export * from './workingDays';

import type {
  CalculationInput,
  CalculationResult,
  ValidationResult,
  UsageRecord,
  YearRemainInput,
  YearRemainResult,
  AnnualLeaveRecord,
} from './types';
import {
  calculateServicePeriod,
  isValidDateString,
  isAfter,
} from './dateUtils';
import { getAccruedDays, getYearlyDays } from './policyEngine';
import { formatHoursAsDaysHours, hoursToDays } from './formatters';

export function validateInput(input: CalculationInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isValidDateString(input.hireDate)) {
    errors.push('입사일이 유효하지 않습니다. (YYYY-MM-DD 형식)');
  }

  if (!isValidDateString(input.asOfDate)) {
    errors.push('기준일이 유효하지 않습니다. (YYYY-MM-DD 형식)');
  }

  if (
    isValidDateString(input.hireDate) &&
    isValidDateString(input.asOfDate) &&
    isAfter(input.hireDate, input.asOfDate)
  ) {
    errors.push('기준일은 입사일 이후여야 합니다.');
  }

  if (input.workHoursPerDay <= 0 || input.workHoursPerDay > 24) {
    errors.push('1일 근로시간은 0보다 크고 24 이하여야 합니다.');
  }

  if (input.usedHoursTotal !== undefined) {
    if (input.usedHoursTotal < 0) {
      errors.push('사용 시간은 0 이상이어야 합니다.');
    }
    if (!Number.isInteger(input.usedHoursTotal)) {
      errors.push('사용 시간은 정수여야 합니다.');
    }
  }

  if (input.usageRecords) {
    input.usageRecords.forEach((record, index) => {
      if (!isValidDateString(record.date)) {
        errors.push(`사용내역 ${index + 1}번: 날짜가 유효하지 않습니다.`);
      } else if (
        isValidDateString(input.asOfDate) &&
        isAfter(record.date, input.asOfDate)
      ) {
        warnings.push(
          `사용내역 ${index + 1}번: 기준일(${input.asOfDate}) 이후 사용내역은 합산에서 제외됩니다.`
        );
      }
      if (record.amountHours <= 0) {
        errors.push(`사용내역 ${index + 1}번: 사용시간은 0보다 커야 합니다.`);
      }
      if (!Number.isInteger(record.amountHours)) {
        errors.push(`사용내역 ${index + 1}번: 사용시간은 정수여야 합니다.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function isDateInYear(date: string, year: number): boolean {
  if (!isValidDateString(date)) return false;
  const dateYear = parseInt(date.split('-')[0]);
  return dateYear === year;
}

export function validateYearRemainInput(input: YearRemainInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) {
    errors.push('기준연도가 유효하지 않습니다.');
  }

  if (!isValidDateString(input.hireDate)) {
    errors.push('입사일이 유효하지 않습니다. (YYYY-MM-DD 형식)');
  }

  if (isValidDateString(input.hireDate)) {
    const hireYear = parseInt(input.hireDate.split('-')[0]);
    if (hireYear > input.year) {
      errors.push('입사일이 기준연도보다 이후입니다.');
    }
  }

  if (input.carryDays < 0) {
    errors.push('이월 연차는 0 이상이어야 합니다.');
  }

  if (input.workHoursPerDay <= 0 || input.workHoursPerDay > 24) {
    errors.push('1일 근로시간은 0보다 크고 24 이하여야 합니다.');
  }

  if (input.annualLeaveRecords) {
    input.annualLeaveRecords.forEach((record, index) => {
      if (!isValidDateString(record.date)) {
        errors.push(`연차 ${index + 1}번: 날짜가 유효하지 않습니다.`);
      } else if (!isDateInYear(record.date, input.year)) {
        errors.push(`연차 ${index + 1}번: 날짜가 ${input.year}년 범위 밖입니다.`);
      }
      if (record.amountHours <= 0) {
        errors.push(`연차 ${index + 1}번: 사용시간은 0보다 커야 합니다.`);
      }
      if (!Number.isInteger(record.amountHours)) {
        errors.push(`연차 ${index + 1}번: 사용시간은 정수여야 합니다.`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function calculateYearUsedHours(annualLeaveRecords: AnnualLeaveRecord[]): number {
  return annualLeaveRecords.reduce((sum, record) => sum + record.amountHours, 0);
}

export function calculateUsedHours(
  usedHoursTotal: number | undefined,
  usageRecords: UsageRecord[] | undefined,
  asOfDate: string
): number {
  if (usageRecords && usageRecords.length > 0) {
    return usageRecords
      .filter(
        (record) =>
          isValidDateString(record.date) &&
          !isAfter(record.date, asOfDate)
      )
      .reduce((sum, record) => sum + record.amountHours, 0);
  }
  return usedHoursTotal ?? 0;
}

export function calculate(input: CalculationInput): CalculationResult {
  const validation = validateInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('\n'));
  }

  const { workHoursPerDay } = input;

  const servicePeriod = calculateServicePeriod(input.hireDate, input.asOfDate);

  const accruedDaysTotal = getAccruedDays(
    input.hireDate,
    input.asOfDate,
    input.policyConfig
  );

  const accruedHoursTotal = accruedDaysTotal * workHoursPerDay;

  const usedHoursTotal = calculateUsedHours(
    input.usedHoursTotal,
    input.usageRecords,
    input.asOfDate
  );

  const remainingHours = accruedHoursTotal - usedHoursTotal;

  const usedDaysTotal = hoursToDays(usedHoursTotal, workHoursPerDay);
  const remainingDays = hoursToDays(remainingHours, workHoursPerDay);

  const accruedPretty = formatHoursAsDaysHours(accruedHoursTotal, workHoursPerDay);
  const usedPretty = formatHoursAsDaysHours(usedHoursTotal, workHoursPerDay);
  const remainingPretty = formatHoursAsDaysHours(remainingHours, workHoursPerDay);

  return {
    servicePeriod,
    accruedHoursTotal,
    usedHoursTotal,
    remainingHours,
    accruedDaysTotal,
    usedDaysTotal,
    remainingDays,
    accruedPretty,
    usedPretty,
    remainingPretty,
  };
}

export function calculateYearRemain(input: YearRemainInput): YearRemainResult {
  const validation = validateYearRemainInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('\n'));
  }

  const { year, hireDate, carryDays, workHoursPerDay, annualLeaveRecords } = input;

  const usedHoursTotal = calculateYearUsedHours(annualLeaveRecords);

  const asOfDate = `${year}-12-31`;
  const servicePeriod = calculateServicePeriod(hireDate, asOfDate);
  const tenureYears = servicePeriod.years;

  let yearlyGrantDays: number;
  if (tenureYears < 1) {
    const hireYear = parseInt(hireDate.split('-')[0]);
    if (hireYear === year) {
      const hireMonth = parseInt(hireDate.split('-')[1]);
      const monthsWorked = 12 - hireMonth + 1;
      yearlyGrantDays = Math.min(monthsWorked, 11);
    } else {
      yearlyGrantDays = Math.min(servicePeriod.totalMonths, 11);
    }
  } else {
    yearlyGrantDays = getYearlyDays(tenureYears);
  }

  const yearlyGrantHours = yearlyGrantDays * workHoursPerDay;
  const carryHours = carryDays * workHoursPerDay;
  const availableHours = yearlyGrantHours + carryHours;
  const availableDays = hoursToDays(availableHours, workHoursPerDay);
  const usedHours = usedHoursTotal;
  const usedDays = hoursToDays(usedHours, workHoursPerDay);
  const remainingHours = availableHours - usedHours;
  const remainingDays = hoursToDays(remainingHours, workHoursPerDay);

  const yearlyGrantPretty = formatHoursAsDaysHours(yearlyGrantHours, workHoursPerDay);
  const carryPretty = formatHoursAsDaysHours(carryHours, workHoursPerDay);
  const availablePretty = formatHoursAsDaysHours(availableHours, workHoursPerDay);
  const usedPretty = formatHoursAsDaysHours(usedHours, workHoursPerDay);
  const remainingPretty = formatHoursAsDaysHours(remainingHours, workHoursPerDay);

  return {
    year,
    tenureYears,
    yearlyGrantDays,
    yearlyGrantHours,
    carryDays,
    carryHours,
    availableDays,
    availableHours,
    usedDays,
    usedHours,
    remainingDays,
    remainingHours,
    yearlyGrantPretty,
    carryPretty,
    availablePretty,
    usedPretty,
    remainingPretty,
  };
}
```

## 11. src/lib/holidays.ts
```ts
/**
 * 공휴일 프리셋 및 유틸리티 함수
 */

export function normalizeDateStr(str: string): string | null {
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  return str;
}

export function mergeUniqueSorted(base: string[], add: string[]): string[] {
  const set = new Set([...base, ...add]);
  return Array.from(set).sort();
}

const KOREAN_PUBLIC_HOLIDAYS_2026: Array<{ date: string; name: string }> = [
  { date: '2026-01-01', name: '신정' },
  { date: '2026-02-16', name: '설날 연휴' },
  { date: '2026-02-17', name: '설날' },
  { date: '2026-02-18', name: '설날 연휴' },
  { date: '2026-03-01', name: '삼일절' },
  { date: '2026-03-02', name: '삼일절 대체공휴일' },
  { date: '2026-05-05', name: '어린이날' },
  { date: '2026-05-24', name: '부처님오신날' },
  { date: '2026-05-25', name: '부처님오신날 대체공휴일' },
  { date: '2026-06-03', name: '지방선거일' },
  { date: '2026-06-06', name: '현충일' },
  { date: '2026-08-15', name: '광복절' },
  { date: '2026-08-17', name: '광복절 대체공휴일' },
  { date: '2026-09-24', name: '추석 연휴' },
  { date: '2026-09-25', name: '추석' },
  { date: '2026-09-26', name: '추석 연휴' },
  { date: '2026-10-03', name: '개천절' },
  { date: '2026-10-05', name: '개천절 대체공휴일' },
  { date: '2026-10-09', name: '한글날' },
  { date: '2026-12-25', name: '크리스마스' },
];

export const SUPPORTED_HOLIDAY_YEARS = [2026];

export function isSupportedYear(year: number): boolean {
  return SUPPORTED_HOLIDAY_YEARS.includes(year);
}

export function getKoreanPublicHolidaysPreset(
  year: number,
  includeLaborDay: boolean = false
): string[] | null {
  if (year === 2026) {
    const holidays = KOREAN_PUBLIC_HOLIDAYS_2026.map((h) => h.date);

    if (includeLaborDay) {
      holidays.push(`${year}-05-01`);
    }

    return holidays.sort();
  }

  return null;
}

export function getHolidayName(date: string, year: number): string | null {
  if (year === 2026) {
    const found = KOREAN_PUBLIC_HOLIDAYS_2026.find((h) => h.date === date);
    if (found) return found.name;

    if (date === `${year}-05-01`) return '근로자의 날';
  }

  return null;
}

export function getKoreanPublicHolidaysDetails(
  year: number,
  includeLaborDay: boolean = false
): Array<{ date: string; name: string }> | null {
  if (year === 2026) {
    const holidays = [...KOREAN_PUBLIC_HOLIDAYS_2026];

    if (includeLaborDay) {
      holidays.push({ date: `${year}-05-01`, name: '근로자의 날' });
    }

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
  }

  return null;
}
```

## 12. src/lib/calendarUtils.ts
```ts
/**
 * 캘린더 관련 유틸리티 함수
 */

export type LeaveKind = 'annual' | 'event' | 'half' | 'hour' | 'unpaid';

export interface LeaveEvent {
  id: string;
  kind: LeaveKind;
  title: string;
  startDate: string;
  endDate: string;
  memo?: string;
  deductDays?: number;
  deductHours?: number;
}

export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isDateInRange(date: Date, startStr: string, endStr: string): boolean {
  const dateStr = formatDateToYYYYMMDD(date);
  return dateStr >= startStr && dateStr <= endStr;
}

export function getEventsForDate(date: Date, events: LeaveEvent[]): LeaveEvent[] {
  return events.filter((event) => isDateInRange(date, event.startDate, event.endDate));
}

export function isHoliday(date: Date, holidays: Set<string>): boolean {
  const dateStr = formatDateToYYYYMMDD(date);
  return holidays.has(dateStr);
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function getBadgeText(kind: LeaveKind): string {
  switch (kind) {
    case 'annual':
      return 'A';
    case 'event':
      return '경';
    case 'half':
      return '½';
    case 'hour':
      return '1h';
    case 'unpaid':
      return '무';
    default:
      return '';
  }
}

export function getKindLabel(kind: LeaveKind): string {
  switch (kind) {
    case 'annual':
      return '연차';
    case 'event':
      return '경조휴가';
    case 'half':
      return '반차';
    case 'hour':
      return '시간연차';
    case 'unpaid':
      return '무급휴가';
    default:
      return '';
  }
}

export function hoursToDisplayDays(hours: number, workHoursPerDay: number = 8): string {
  const days = hours / workHoursPerDay;
  if (days === Math.floor(days)) {
    return `${days}일`;
  }
  return `${days.toFixed(1)}일`;
}
```
