/**
 * 연차 계산기 핵심 모듈
 * 내부 계산 단위: 시간(hours)
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

/**
 * 입력값 유효성 검사 (AUTO_TOTAL 모드)
 */
export function validateInput(input: CalculationInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 날짜 형식 검사
  if (!isValidDateString(input.hireDate)) {
    errors.push('입사일이 유효하지 않습니다. (YYYY-MM-DD 형식)');
  }

  if (!isValidDateString(input.asOfDate)) {
    errors.push('기준일이 유효하지 않습니다. (YYYY-MM-DD 형식)');
  }

  // 날짜 순서 검사
  if (
    isValidDateString(input.hireDate) &&
    isValidDateString(input.asOfDate) &&
    isAfter(input.hireDate, input.asOfDate)
  ) {
    errors.push('기준일은 입사일 이후여야 합니다.');
  }

  // 근로시간 검사
  if (input.workHoursPerDay <= 0 || input.workHoursPerDay > 24) {
    errors.push('1일 근로시간은 0보다 크고 24 이하여야 합니다.');
  }

  // 사용 시간 검사 (usedHoursTotal)
  if (input.usedHoursTotal !== undefined) {
    if (input.usedHoursTotal < 0) {
      errors.push('사용 시간은 0 이상이어야 합니다.');
    }
    if (!Number.isInteger(input.usedHoursTotal)) {
      errors.push('사용 시간은 정수여야 합니다.');
    }
  }

  // 사용내역 리스트 검사
  if (input.usageRecords) {
    input.usageRecords.forEach((record, index) => {
      if (!isValidDateString(record.date)) {
        errors.push(`사용내역 ${index + 1}번: 날짜가 유효하지 않습니다.`);
      } else if (
        isValidDateString(input.asOfDate) &&
        isAfter(record.date, input.asOfDate)
      ) {
        // 기준일 이후 사용내역은 warning
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

/**
 * 날짜가 특정 연도 범위 내에 있는지 검사
 */
export function isDateInYear(date: string, year: number): boolean {
  if (!isValidDateString(date)) return false;
  const dateYear = parseInt(date.split('-')[0]);
  return dateYear === year;
}

/**
 * 입력값 유효성 검사 (YEAR_REMAIN 모드)
 */
export function validateYearRemainInput(input: YearRemainInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 연도 검사
  if (!Number.isInteger(input.year) || input.year < 1900 || input.year > 2100) {
    errors.push('기준연도가 유효하지 않습니다.');
  }

  // 입사일 검사
  if (!isValidDateString(input.hireDate)) {
    errors.push('입사일이 유효하지 않습니다. (YYYY-MM-DD 형식)');
  }

  // 입사일이 기준연도 이후인지 검사
  if (isValidDateString(input.hireDate)) {
    const hireYear = parseInt(input.hireDate.split('-')[0]);
    if (hireYear > input.year) {
      errors.push('입사일이 기준연도보다 이후입니다.');
    }
  }

  // 이월 연차 검사
  if (input.carryDays < 0) {
    errors.push('이월 연차는 0 이상이어야 합니다.');
  }

  // 근로시간 검사
  if (input.workHoursPerDay <= 0 || input.workHoursPerDay > 24) {
    errors.push('1일 근로시간은 0보다 크고 24 이하여야 합니다.');
  }

  // 연차 사용내역 리스트 검사
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

/**
 * YEAR_REMAIN 연차 사용 시간 합계 계산
 * 경조휴가는 포함하지 않음 (연차만 계산)
 */
export function calculateYearUsedHours(annualLeaveRecords: AnnualLeaveRecord[]): number {
  return annualLeaveRecords.reduce((sum, record) => sum + record.amountHours, 0);
}

/**
 * 사용 시간 합계 계산
 * usageRecords가 있으면 리스트 기반으로 (기준일 이하만), 없으면 usedHoursTotal 사용
 */
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
          !isAfter(record.date, asOfDate) // record.date <= asOfDate
      )
      .reduce((sum, record) => sum + record.amountHours, 0);
  }
  return usedHoursTotal ?? 0;
}

/**
 * 연차 계산 메인 함수 (AUTO_TOTAL 모드)
 */
export function calculate(input: CalculationInput): CalculationResult {
  const validation = validateInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('\n'));
  }

  const { workHoursPerDay } = input;

  // 근속기간 계산
  const servicePeriod = calculateServicePeriod(input.hireDate, input.asOfDate);

  // 발생 연차 계산 (정책 엔진 사용) - 일 단위
  const accruedDaysTotal = getAccruedDays(
    input.hireDate,
    input.asOfDate,
    input.policyConfig
  );

  // 발생 시간 계산
  const accruedHoursTotal = accruedDaysTotal * workHoursPerDay;

  // 사용 시간 계산 (기준일 이하만 합산)
  const usedHoursTotal = calculateUsedHours(
    input.usedHoursTotal,
    input.usageRecords,
    input.asOfDate
  );

  // 잔여 시간 계산
  const remainingHours = accruedHoursTotal - usedHoursTotal;

  // 표시용 일수 계산
  const usedDaysTotal = hoursToDays(usedHoursTotal, workHoursPerDay);
  const remainingDays = hoursToDays(remainingHours, workHoursPerDay);

  // Pretty 문자열 생성
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

/**
 * 연도별 잔여 연차 계산 (YEAR_REMAIN 모드)
 */
export function calculateYearRemain(input: YearRemainInput): YearRemainResult {
  const validation = validateYearRemainInput(input);
  if (!validation.isValid) {
    throw new Error(validation.errors.join('\n'));
  }

  const { year, hireDate, carryDays, workHoursPerDay, annualLeaveRecords } = input;

  // 연차 사용 시간 합계 계산 (경조휴가는 제외)
  const usedHoursTotal = calculateYearUsedHours(annualLeaveRecords);

  // 기준연도 말일 기준 근속기간 계산
  const asOfDate = `${year}-12-31`;
  const servicePeriod = calculateServicePeriod(hireDate, asOfDate);
  const tenureYears = servicePeriod.years;

  // 올해 발생 연차 계산
  // 1년 미만이면 월차로 계산, 1년 이상이면 해당 년차의 연차
  let yearlyGrantDays: number;
  if (tenureYears < 1) {
    // 입사 첫해: 해당 연도 내 근무 개월수 (최대 11일)
    const hireYear = parseInt(hireDate.split('-')[0]);
    if (hireYear === year) {
      // 올해 입사한 경우
      const hireMonth = parseInt(hireDate.split('-')[1]);
      const monthsWorked = 12 - hireMonth + 1;
      yearlyGrantDays = Math.min(monthsWorked, 11);
    } else {
      // 작년 입사했지만 아직 1년 미만
      yearlyGrantDays = Math.min(servicePeriod.totalMonths, 11);
    }
  } else {
    // 1년 이상 근속: 해당 년차의 연차
    yearlyGrantDays = getYearlyDays(tenureYears);
  }

  const yearlyGrantHours = yearlyGrantDays * workHoursPerDay;

  // 이월 연차
  const carryHours = carryDays * workHoursPerDay;

  // 보유 연차 (발생 + 이월)
  const availableHours = yearlyGrantHours + carryHours;
  const availableDays = hoursToDays(availableHours, workHoursPerDay);

  // 사용 연차
  const usedHours = usedHoursTotal;
  const usedDays = hoursToDays(usedHours, workHoursPerDay);

  // 잔여 연차
  const remainingHours = availableHours - usedHours;
  const remainingDays = hoursToDays(remainingHours, workHoursPerDay);

  // Pretty 문자열 생성
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
