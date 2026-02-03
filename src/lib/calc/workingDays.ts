/**
 * 근무일 계산 유틸리티
 * - 달력일(휴일 포함) 기간에서 실제 근무일을 계산
 * - 주말(토/일) + 공휴일 제외
 */

/**
 * 날짜를 YYYY-MM-DD 문자열로 변환 (로컬 타임존 이슈 방지)
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * YYYY-MM-DD 문자열을 Date 객체로 변환 (로컬 타임존 기준)
 */
export function parseLocalDate(dateStr: string): Date {
  // "YYYY-MM-DDT00:00:00" 형태로 파싱하여 로컬 타임존 이슈 방지
  return new Date(`${dateStr}T00:00:00`);
}

/**
 * 주말 여부 확인 (토요일=6, 일요일=0)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * 날짜가 공휴일인지 확인
 * @param dateStr YYYY-MM-DD 형식
 * @param holidays 공휴일 목록 (Set<string> 형태, YYYY-MM-DD)
 */
export function isHoliday(dateStr: string, holidays: Set<string>): boolean {
  return holidays.has(dateStr);
}

/**
 * 시작일부터 calendarDays 동안의 날짜 범위 생성
 * @returns YYYY-MM-DD 문자열 배열
 */
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

/**
 * 근무일 계산 (핵심 함수)
 * - startDate를 포함하여 calendarDays 만큼 연속된 날짜 범위에서
 * - 주말(토/일)과 공휴일을 제외한 근무일 수를 반환
 *
 * @param startDateStr 시작일 (YYYY-MM-DD)
 * @param calendarDays 달력 기준 일수 (휴일 포함)
 * @param holidays 공휴일 목록 (Set<string>, YYYY-MM-DD)
 * @returns 근무일 수
 */
export function calculateWorkingDays(
  startDateStr: string,
  calendarDays: number,
  holidays: Set<string>
): number {
  const dateRange = getDateRange(startDateStr, calendarDays);

  let workingDays = 0;

  for (const dateStr of dateRange) {
    const date = parseLocalDate(dateStr);

    // 주말이 아니고, 공휴일도 아닌 경우만 근무일로 카운트
    if (!isWeekend(date) && !isHoliday(dateStr, holidays)) {
      workingDays++;
    }
  }

  return workingDays;
}

/**
 * 근무일 계산 결과 상세 정보
 */
export interface WorkingDaysResult {
  calendarDays: number; // 규정 달력일
  workingDays: number; // 실제 근무일
  weekendDays: number; // 주말 수
  holidayDays: number; // 공휴일 수 (주말과 중복 제외)
  dateRange: string[]; // 날짜 범위
}

/**
 * 근무일 계산 (상세 결과 포함)
 */
export function calculateWorkingDaysDetailed(
  startDateStr: string,
  calendarDays: number,
  holidays: Set<string>
): WorkingDaysResult {
  const dateRange = getDateRange(startDateStr, calendarDays);

  let workingDays = 0;
  let weekendDays = 0;
  let holidayDays = 0; // 주말이 아닌 공휴일만 카운트

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

/**
 * 날짜 범위의 끝 날짜 계산
 */
export function getEndDate(startDateStr: string, calendarDays: number): string {
  const startDate = parseLocalDate(startDateStr);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + calendarDays - 1);
  return formatDateToYYYYMMDD(endDate);
}
