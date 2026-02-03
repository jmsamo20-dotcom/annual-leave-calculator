/**
 * 포맷터 유틸리티 함수
 */

import type { UsagePreset } from './types';

/**
 * 시간을 "X일 Y시간" 형식으로 포맷
 * @param hours 시간 (정수)
 * @param workHoursPerDay 1일 근로시간
 * @returns 포맷된 문자열
 */
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

/**
 * 일수를 시간으로 변환
 * @param days 일수
 * @param workHoursPerDay 1일 근로시간
 * @returns 시간 (정수가 아닐 수 있음)
 */
export function daysToHours(days: number, workHoursPerDay: number): number {
  return days * workHoursPerDay;
}

/**
 * 시간을 일수로 변환
 * @param hours 시간
 * @param workHoursPerDay 1일 근로시간
 * @returns 일수
 */
export function hoursToDays(hours: number, workHoursPerDay: number): number {
  return hours / workHoursPerDay;
}

/**
 * 일수 입력이 유효한 시간(정수)으로 변환 가능한지 검사
 * @param days 일수
 * @param workHoursPerDay 1일 근로시간
 * @returns 변환 가능 여부
 */
export function isValidDaysInput(
  days: number,
  workHoursPerDay: number
): boolean {
  const hours = daysToHours(days, workHoursPerDay);
  return Number.isInteger(hours) && hours >= 0;
}

/**
 * 프리셋을 시간으로 변환
 * @param preset 프리셋 타입
 * @param workHoursPerDay 1일 근로시간
 * @returns 시간 (정수)
 */
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
      return 0; // 직접입력
  }
}

/**
 * 프리셋의 기본 메모 텍스트
 */
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

/**
 * 시간 값을 기준으로 사용자 친화적인 유형 라벨을 반환
 * @param amountHours 사용 시간
 * @param workHoursPerDay 1일 근로시간 (기본 8)
 * @param memo 메모 (오전/오후 반차 구분용)
 * @returns 유형 라벨 문자열
 */
export function getLeaveTypeLabel(amountHours: number, workHoursPerDay: number = 8, memo?: string): string {
  const halfDayHours = workHoursPerDay / 2;

  if (amountHours === workHoursPerDay) {
    return '연차(1일)';
  }
  if (amountHours === halfDayHours) {
    if (memo?.includes('오전')) {
      return '오전반차(4hr)';
    }
    if (memo?.includes('오후')) {
      return '오후반차(4hr)';
    }
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
  // 기타 시간의 경우
  return `${amountHours}시간`;
}
