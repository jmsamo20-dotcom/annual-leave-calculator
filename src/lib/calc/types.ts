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
  // TODO: 정책별 추가 설정을 여기에 확장
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
  year: number; // 기준연도 (예: 2026)
  hireDate: string; // YYYY-MM-DD
  carryDays: number; // 작년 이월 연차 (일 단위)
  workHoursPerDay: number;
  annualLeaveRecords: AnnualLeaveRecord[]; // 연차 사용내역 (시간 단위)
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

  // 시간 기반 (내부 계산 단위)
  accruedHoursTotal: number;
  usedHoursTotal: number;
  remainingHours: number;

  // 일 기반 (표시용)
  accruedDaysTotal: number;
  usedDaysTotal: number;
  remainingDays: number;

  // Pretty 문자열 (X일 Y시간)
  accruedPretty: string;
  usedPretty: string;
  remainingPretty: string;
}

/** 연도별 잔여 연차 결과 타입 (YEAR_REMAIN 모드) */
export interface YearRemainResult {
  year: number;
  tenureYears: number; // 해당 연도 말 기준 근속년수

  // 올해 발생
  yearlyGrantDays: number;
  yearlyGrantHours: number;

  // 이월
  carryDays: number;
  carryHours: number;

  // 보유 (발생 + 이월)
  availableDays: number;
  availableHours: number;

  // 사용
  usedDays: number;
  usedHours: number;

  // 잔여
  remainingDays: number;
  remainingHours: number;

  // Pretty 문자열
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

// =============================================
// 휴가 유형 구분 (연차 vs 경조휴가)
// =============================================

/** 휴가 유형 */
export type LeaveType = 'ANNUAL' | 'EVENT';

/** 연차 휴가 기록 (시간 단위) */
export interface AnnualLeaveRecord {
  id: string;
  type: 'ANNUAL';
  date: string; // YYYY-MM-DD
  amountHours: number; // 정수, 시간 단위
  memo: string;
}

/** 경조휴가 기록 (일 단위) */
export interface EventLeaveRecord {
  id: string;
  type: 'EVENT';
  date: string; // 시작일 YYYY-MM-DD
  eventType: EventLeaveType; // 경조사 유형
  title: string; // 표시용 제목 (예: "결혼(본인)")
  calendarDays: number; // 규정 일수 (휴일 포함, 달력일)
  workingDays: number; // 실제 반영 일수 (근무일 기준)
  memo: string;
}

// 기존 코드 호환성을 위해 days getter (deprecated)
// 새 코드에서는 calendarDays와 workingDays를 명시적으로 사용

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
  calendarDays: number; // 규정 일수 (휴일 포함)
  note?: string; // 규정 설명 (예: "휴일 포함")
}

/** 통합 저장 데이터 (YEAR_REMAIN 모드) */
export interface YearStateData {
  year: number;
  hireDate: string;
  carryDays: number;
  annualLeaveRecords: AnnualLeaveRecord[];
  eventLeaveRecords: EventLeaveRecord[];
}
