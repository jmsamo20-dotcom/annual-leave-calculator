/**
 * DEFAULT 정책: 기본 연차 발생 계산
 *
 * TODO: 실제 한국 근로기준법에 맞는 연차 계산 로직으로 교체 필요
 * 현재는 확장 가능한 구조 시연을 위한 샘플 로직 구현
 *
 * 샘플 로직 (근속기간 기반):
 * - 1년 미만: 1개월 만근 시 1일 발생 (최대 11일)
 * - 1년 이상: 11 + sum_{y=1..years}(min(15 + floor((y-1)/2), 25))
 *   - y=1: 15일, y=2: 15일, y=3: 16일, y=4: 16일, ...
 *   - 2년마다 1일씩 추가, 최대 25일
 */

import { calculateServicePeriod, parseDate } from '../dateUtils';

export interface DefaultPolicyOptions {
  // TODO: 정책별 옵션 추가 가능
}

/**
 * 특정 년차에 발생하는 연차 일수 계산
 * @param y 년차 (1부터 시작)
 * @returns 해당 년차의 연차 일수
 */
export function getYearlyDays(y: number): number {
  if (y < 1) return 0;
  return Math.min(15 + Math.floor((y - 1) / 2), 25);
}

/**
 * DEFAULT 정책에 따른 발생 연차 계산
 */
export function calculateDefaultAccruedDays(
  hireDate: string,
  asOfDate: string,
  _options?: DefaultPolicyOptions
): number {
  const { years, totalMonths } = calculateServicePeriod(hireDate, asOfDate);
  const hire = parseDate(hireDate);
  const asOf = parseDate(asOfDate);

  // 기준일이 입사일보다 이전이면 0
  if (asOf.getTime() < hire.getTime()) {
    return 0;
  }

  // 1년 미만인 경우: 월 1일 (만근 가정), 최대 11일
  if (years < 1) {
    return Math.min(totalMonths, 11);
  }

  // 1년 이상인 경우: 1년차 월차(11일) + 각 년차별 연차 누적
  let accrued = 11;

  for (let y = 1; y <= years; y++) {
    accrued += getYearlyDays(y);
  }

  return accrued;
}
