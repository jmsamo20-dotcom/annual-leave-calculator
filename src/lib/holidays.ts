/**
 * 공휴일 프리셋 및 유틸리티 함수
 */

/**
 * YYYY-MM-DD 형식 검증 및 정규화
 */
export function normalizeDateStr(str: string): string | null {
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  // 기본 범위 검사
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  return str;
}

/**
 * 두 날짜 배열을 중복 제거 후 오름차순 정렬하여 병합
 */
export function mergeUniqueSorted(base: string[], add: string[]): string[] {
  const set = new Set([...base, ...add]);
  return Array.from(set).sort();
}

/**
 * 2026년 대한민국 국가공휴일 프리셋
 */
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

/**
 * 지원하는 연도 목록
 */
export const SUPPORTED_HOLIDAY_YEARS = [2026];

/**
 * 연도가 지원되는지 확인
 */
export function isSupportedYear(year: number): boolean {
  return SUPPORTED_HOLIDAY_YEARS.includes(year);
}

/**
 * 대한민국 국가공휴일 프리셋 가져오기
 * @param year 연도
 * @param includeLaborDay 근로자의 날(5/1) 포함 여부
 * @returns 공휴일 날짜 배열 (YYYY-MM-DD) 또는 null (지원하지 않는 연도)
 */
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

  // 다른 연도는 아직 지원하지 않음
  return null;
}

/**
 * 공휴일 이름 가져오기 (참고용)
 */
export function getHolidayName(date: string, year: number): string | null {
  if (year === 2026) {
    const found = KOREAN_PUBLIC_HOLIDAYS_2026.find((h) => h.date === date);
    if (found) return found.name;

    // 근로자의 날
    if (date === `${year}-05-01`) return '근로자의 날';
  }

  return null;
}

/**
 * 공휴일 프리셋 상세 정보 (UI 표시용)
 */
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
