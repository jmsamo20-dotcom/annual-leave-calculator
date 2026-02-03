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
 * ※ 모든 일수는 "휴일 포함" 달력일 기준
 * ※ 실제 휴가 반영은 근무일 기준으로 자동 계산됨
 *
 * - 결혼: 본인 7일, 자녀 1일, 형제자매 1일
 * - 사망: 배우자 5일, 부모 5일, 자녀 3일, 형제자매 3일, 조부모 3일
 */
export const EVENT_LEAVE_POLICIES: EventLeavePolicy[] = [
  // 결혼
  { type: 'MARRIAGE_SELF', category: 'MARRIAGE', title: '결혼(본인)', calendarDays: 7, note: '휴일 포함' },
  { type: 'MARRIAGE_CHILD', category: 'MARRIAGE', title: '결혼(자녀)', calendarDays: 1, note: '휴일 포함' },
  { type: 'MARRIAGE_SIBLING', category: 'MARRIAGE', title: '결혼(형제/자매)', calendarDays: 1, note: '휴일 포함' },
  // 사망
  { type: 'DEATH_SPOUSE', category: 'DEATH', title: '사망(배우자)', calendarDays: 5, note: '휴일 포함' },
  { type: 'DEATH_PARENT', category: 'DEATH', title: '사망(부모)', calendarDays: 5, note: '휴일 포함' },
  { type: 'DEATH_CHILD', category: 'DEATH', title: '사망(자녀)', calendarDays: 3, note: '휴일 포함' },
  { type: 'DEATH_SIBLING', category: 'DEATH', title: '사망(형제/자매)', calendarDays: 3, note: '휴일 포함' },
  { type: 'DEATH_GRANDPARENT', category: 'DEATH', title: '사망(조부모/외조부모)', calendarDays: 3, note: '휴일 포함' },
];

/** 결혼 관련 경조휴가 */
export const MARRIAGE_POLICIES = EVENT_LEAVE_POLICIES.filter(p => p.category === 'MARRIAGE');

/** 사망 관련 경조휴가 */
export const DEATH_POLICIES = EVENT_LEAVE_POLICIES.filter(p => p.category === 'DEATH');

/** 경조휴가 유형으로 정책 찾기 */
export function getEventLeavePolicy(type: string): EventLeavePolicy | undefined {
  return EVENT_LEAVE_POLICIES.find(p => p.type === type);
}
