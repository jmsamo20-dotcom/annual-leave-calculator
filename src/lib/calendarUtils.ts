/**
 * 캘린더 관련 유틸리티 함수
 */

/**
 * 휴가 종류
 */
export type LeaveKind = 'annual' | 'event' | 'half' | 'hour' | 'unpaid';

/**
 * 캘린더에 표시할 휴가 이벤트
 */
export interface LeaveEvent {
  id: string;
  kind: LeaveKind;
  title: string; // 예: "신혼여행(연차)", "본인 결혼(경조)"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (하루짜리면 start=end)
  memo?: string;
  deductDays?: number; // 연차 차감일수 (반차 0.5 등), 경조휴가는 workingDays
  deductHours?: number; // 연차 차감시간
}

/**
 * YYYY-MM-DD 문자열을 Date 객체로 변환 (로컬 타임존 기준, 시간 이슈 방지)
 */
export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

/**
 * Date 객체를 YYYY-MM-DD 문자열로 변환
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 특정 날짜가 이벤트 범위(start~end)에 포함되는지 확인
 */
export function isDateInRange(date: Date, startStr: string, endStr: string): boolean {
  const dateStr = formatDateToYYYYMMDD(date);
  return dateStr >= startStr && dateStr <= endStr;
}

/**
 * 특정 날짜에 해당하는 이벤트 목록 필터링
 */
export function getEventsForDate(date: Date, events: LeaveEvent[]): LeaveEvent[] {
  return events.filter((event) => isDateInRange(date, event.startDate, event.endDate));
}

/**
 * 특정 날짜가 공휴일인지 확인
 */
export function isHoliday(date: Date, holidays: Set<string>): boolean {
  const dateStr = formatDateToYYYYMMDD(date);
  return holidays.has(dateStr);
}

/**
 * 특정 날짜가 주말인지 확인
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * 휴가 종류별 뱃지 텍스트
 */
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

/**
 * 휴가 종류별 라벨
 */
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

/**
 * 시간을 일수로 변환 (8시간 = 1일 기준)
 */
export function hoursToDisplayDays(hours: number, workHoursPerDay: number = 8): string {
  const days = hours / workHoursPerDay;
  if (days === Math.floor(days)) {
    return `${days}일`;
  }
  return `${days.toFixed(1)}일`;
}
