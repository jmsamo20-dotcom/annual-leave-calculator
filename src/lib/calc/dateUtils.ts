/**
 * 날짜 유틸리티 함수
 * Timezone 버그를 피하기 위해 UTC 기준으로 안전하게 처리
 */

/**
 * YYYY-MM-DD 문자열을 UTC Date 객체로 파싱
 * Timezone offset 문제를 피하기 위해 명시적으로 UTC로 처리
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Date 객체를 YYYY-MM-DD 문자열로 변환
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 날짜 문자열이 유효한 YYYY-MM-DD 형식인지 검사
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const date = parseDate(dateStr);
  return !isNaN(date.getTime()) && formatDate(date) === dateStr;
}

/**
 * 두 날짜 사이의 근속기간 계산 (년, 월)
 */
export function calculateServicePeriod(
  hireDate: string,
  asOfDate: string
): { years: number; months: number; totalMonths: number } {
  const hire = parseDate(hireDate);
  const asOf = parseDate(asOfDate);

  let years = asOf.getUTCFullYear() - hire.getUTCFullYear();
  let months = asOf.getUTCMonth() - hire.getUTCMonth();

  // 일자 보정: 기준일의 일자가 입사일의 일자보다 작으면 1개월 차감
  if (asOf.getUTCDate() < hire.getUTCDate()) {
    months--;
  }

  // 월이 음수면 년도에서 차감
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = years * 12 + months;

  return { years, months, totalMonths };
}

/**
 * date1이 date2보다 이전인지 검사
 */
export function isBefore(date1: string, date2: string): boolean {
  return parseDate(date1).getTime() < parseDate(date2).getTime();
}

/**
 * date1이 date2보다 이후인지 검사
 */
export function isAfter(date1: string, date2: string): boolean {
  return parseDate(date1).getTime() > parseDate(date2).getTime();
}

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 유연한 날짜 입력을 YYYY-MM-DD 형식으로 정규화
 * 허용 형식: "2024-06-12", "2024/6/12", "2024 6 12", "2024.6.12"
 * @returns 정규화된 YYYY-MM-DD 문자열 또는 파싱 실패 시 null
 */
export function normalizeDateInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 구분자: -, /, ., 공백 1개 이상
  const parts = trimmed.split(/[-/.\s]+/);
  if (parts.length !== 3) return null;

  const [yearStr, monthStr, dayStr] = parts;

  // year: 4자리 숫자
  if (!/^\d{4}$/.test(yearStr)) return null;
  const year = parseInt(yearStr, 10);

  // month: 1~2자리 숫자, 1~12 범위
  if (!/^\d{1,2}$/.test(monthStr)) return null;
  const month = parseInt(monthStr, 10);
  if (month < 1 || month > 12) return null;

  // day: 1~2자리 숫자, 1~31 범위
  if (!/^\d{1,2}$/.test(dayStr)) return null;
  const day = parseInt(dayStr, 10);
  if (day < 1 || day > 31) return null;

  // YYYY-MM-DD 형식으로 조합
  const normalized = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // 실제로 유효한 날짜인지 최종 확인 (예: 2월 30일 같은 경우 방지)
  if (!isValidDateString(normalized)) return null;

  return normalized;
}
