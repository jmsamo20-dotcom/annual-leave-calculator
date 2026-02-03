/**
 * 정책 엔진: 정책별 연차 계산 로직을 관리
 * 새로운 정책 추가 시 이 파일에 등록
 */

import type { PolicyConfig } from './types';
import { calculateDefaultAccruedDays, getYearlyDays } from './policies/default';

export { getYearlyDays };

/** 정책 계산 함수 타입 */
type PolicyCalculator = (
  hireDate: string,
  asOfDate: string,
  config: PolicyConfig
) => number;

/** 정책 레지스트리 */
const policyRegistry: Record<string, PolicyCalculator> = {
  DEFAULT: (hireDate, asOfDate, _config) => {
    return calculateDefaultAccruedDays(hireDate, asOfDate);
  },
  // TODO: 새로운 정책 추가 시 여기에 등록
  // EXAMPLE_COMPANY: (hireDate, asOfDate, config) => { ... }
};

/**
 * 정책 설정에 따라 발생 연차를 계산
 * @param hireDate 입사일 (YYYY-MM-DD)
 * @param asOfDate 기준일 (YYYY-MM-DD)
 * @param policyConfig 정책 설정
 * @returns 발생 연차 일수
 */
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

/**
 * 등록된 정책 목록 반환
 */
export function getAvailablePolicies(): string[] {
  return Object.keys(policyRegistry);
}

/**
 * 새로운 정책 등록 (런타임 확장용)
 */
export function registerPolicy(
  name: string,
  calculator: PolicyCalculator
): void {
  policyRegistry[name] = calculator;
}
