import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  calculateYearRemain,
  validateYearRemainInput,
  WORK_HOURS_PER_DAY,
} from './lib/calc';
import type {
  PolicyConfig,
  AnnualLeaveRecord,
  EventLeaveRecord,
} from './lib/calc';
import { getTodayString } from './lib/calc/dateUtils';
import { hoursToDays, formatHoursAsDaysHours } from './lib/calc/formatters';
import { YearRemainDisplay } from './components/YearRemainDisplay';
import { EventLeaveSelector } from './components/EventLeaveSelector';
import { LeaveCalendar } from './components/LeaveCalendar';
import { calculateWorkingDays } from './lib/calc/workingDays';
import { parseMonthDay, formatToDateString } from './components/MonthDayPicker';
import { getDefaultHolidays } from './lib/holidays';
import './App.css';

// 앱 버전
const APP_VERSION = '1.1.0';

// 테마 타입 및 localStorage 키
type Theme = 'light' | 'dark';
const THEME_KEY = 'theme';

// 초기 테마 결정 함수
function getInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// 통합 저장 데이터 구조
type YearState = {
  year: number;
  hireDate: string;
  carryDays: number;
  annualLeaveRecords: AnnualLeaveRecord[];
  eventLeaveRecords: EventLeaveRecord[];
  holidays: string[];
};

const HIRE_DATE_KEY = 'annual_leave_hire_date';
const LAST_SAVED_AT_KEY = 'lastSavedAt';
const EVENT_LEAVE_EXPANDED_KEY = 'ui.eventLeaveExpanded';

const getStorageKey = (year: number) => `annual_leave_year_${year}`;

// 마지막 저장 시각 포맷팅
function formatLastSavedAt(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}.${m}.${d}.${h}:${min}`;
}

const safeParse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

// 기존 데이터 마이그레이션
function migrateOldData(saved: Record<string, unknown>): YearState | null {
  if (!saved || typeof saved !== 'object') return null;

  if ('annualLeaveRecords' in saved && 'holidays' in saved) {
    return saved as YearState;
  }

  if ('annualLeaveRecords' in saved) {
    type OldEventRecord = {
      id: string;
      type: 'EVENT';
      date: string;
      eventType: string;
      title: string;
      days?: number;
      calendarDays?: number;
      workingDays?: number;
      memo: string;
    };

    const data = saved as {
      year: number;
      hireDate: string;
      carryDays: number;
      annualLeaveRecords: AnnualLeaveRecord[];
      eventLeaveRecords: OldEventRecord[];
    };

    const migratedEventRecords: EventLeaveRecord[] = (data.eventLeaveRecords || []).map((r) => {
      if (r.calendarDays !== undefined && r.workingDays !== undefined) {
        return {
          id: r.id,
          type: 'EVENT' as const,
          date: r.date,
          eventType: r.eventType as EventLeaveRecord['eventType'],
          title: r.title,
          calendarDays: r.calendarDays,
          workingDays: r.workingDays,
          memo: r.memo,
        };
      }
      const calendarDays = r.calendarDays ?? r.days ?? 0;
      return {
        id: r.id,
        type: 'EVENT' as const,
        date: r.date,
        eventType: r.eventType as EventLeaveRecord['eventType'],
        title: r.title,
        calendarDays,
        workingDays: r.workingDays ?? calendarDays,
        memo: r.memo,
      };
    });

    return {
      year: data.year,
      hireDate: data.hireDate,
      carryDays: data.carryDays,
      annualLeaveRecords: data.annualLeaveRecords,
      eventLeaveRecords: migratedEventRecords,
      holidays: [],
    };
  }

  if ('usageRecords' in saved && Array.isArray(saved.usageRecords)) {
    const oldRecords = saved.usageRecords as Array<{
      id: string;
      date: string;
      amountHours: number;
      memo: string;
    }>;

    const annualLeaveRecords: AnnualLeaveRecord[] = oldRecords.map((r) => ({
      id: r.id,
      type: 'ANNUAL' as const,
      date: r.date,
      amountHours: r.amountHours,
      memo: r.memo,
    }));

    return {
      year: (saved.year as number) || new Date().getFullYear(),
      hireDate: (saved.hireDate as string) || '',
      carryDays: (saved.carryDays as number) || 0,
      annualLeaveRecords,
      eventLeaveRecords: [],
      holidays: [],
    };
  }

  return null;
}

function App() {
  // 테마 상태
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // 공통 입력값
  const [hireDate, setHireDate] = useState<string>('');
  const [hireDateError, setHireDateError] = useState('');
  const policyConfig: PolicyConfig = { type: 'DEFAULT' };

  // 연도 및 기본 상태
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  // 이월연차: 입력용 문자열 상태 (빈 값 허용)
  const [carryDaysInput, setCarryDaysInput] = useState<string>('0');
  const [carryDays, setCarryDays] = useState<number>(0);

  const [referenceDate] = useState<string>(getTodayString());
  const [annualLeaveRecords, setAnnualLeaveRecords] = useState<AnnualLeaveRecord[]>([]);
  const [eventLeaveRecords, setEventLeaveRecords] = useState<EventLeaveRecord[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => localStorage.getItem(LAST_SAVED_AT_KEY));

  const holidaysSet = useMemo(() => new Set(holidays), [holidays]);

  // 경조휴가 섹션 펼침/접힘 상태
  const [eventLeaveExpanded, setEventLeaveExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem(EVENT_LEAVE_EXPANDED_KEY);
    // localStorage에 저장된 값이 있으면 사용
    if (saved !== null) {
      return saved === 'true';
    }
    // 없으면 기본값 false (접힘) - 데이터 로드 후 기록 있으면 펼침으로 변경됨
    return false;
  });

  // 캘린더 선택 해제 신호 (페이지 외부 클릭 시 증가)
  const [clearSelectionSignal, setClearSelectionSignal] = useState<number>(0);

  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // [1] 불러오기 (공휴일 자동 적용)
  useEffect(() => {
    setIsHydrated(false);

    const raw = localStorage.getItem(getStorageKey(year));
    const parsed = safeParse<Record<string, unknown>>(raw);
    const saved = parsed ? migrateOldData(parsed) : null;

    if (saved) {
      setCarryDays(saved.carryDays ?? 0);
      setCarryDaysInput(String(saved.carryDays ?? 0));
      setAnnualLeaveRecords(Array.isArray(saved.annualLeaveRecords) ? saved.annualLeaveRecords : []);
      const loadedEventRecords = Array.isArray(saved.eventLeaveRecords) ? saved.eventLeaveRecords : [];
      setEventLeaveRecords(loadedEventRecords);
      const savedHolidays = Array.isArray(saved.holidays) ? saved.holidays : [];
      if (savedHolidays.length > 0) {
        setHolidays(savedHolidays);
      } else {
        setHolidays(getDefaultHolidays(year));
      }
      if (saved.hireDate) {
        setHireDate(saved.hireDate);
      }
      // 경조휴가 기록이 있고, 사용자가 명시적으로 접기를 선택한 적이 없으면 자동 펼침
      const savedExpandedPref = localStorage.getItem(EVENT_LEAVE_EXPANDED_KEY);
      if (savedExpandedPref === null && loadedEventRecords.length > 0) {
        setEventLeaveExpanded(true);
      }
    } else {
      setCarryDays(0);
      setCarryDaysInput('0');
      setAnnualLeaveRecords([]);
      setEventLeaveRecords([]);
      setHolidays(getDefaultHolidays(year));
    }

    const savedHireDate = localStorage.getItem(HIRE_DATE_KEY);
    if (savedHireDate && !saved?.hireDate) {
      setHireDate(savedHireDate);
    }

    setIsHydrated(true);
  }, [year]);

  // [2] 저장
  useEffect(() => {
    if (!isHydrated) return;

    const payload: YearState = {
      year,
      hireDate,
      carryDays,
      annualLeaveRecords,
      eventLeaveRecords,
      holidays,
    };

    localStorage.setItem(getStorageKey(year), JSON.stringify(payload));

    if (hireDate) {
      localStorage.setItem(HIRE_DATE_KEY, hireDate);
    }
  }, [isHydrated, year, carryDays, annualLeaveRecords, eventLeaveRecords, holidays, hireDate]);

  // 이월연차 입력 핸들러 (빈 값 허용)
  const handleCarryDaysChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // 빈 값 또는 숫자/소수점만 허용
    if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
      setCarryDaysInput(val);
    }
  }, []);

  // 이월연차 blur 시 숫자로 변환
  const handleCarryDaysBlur = useCallback(() => {
    const num = parseFloat(carryDaysInput);
    if (isNaN(num) || carryDaysInput === '') {
      setCarryDays(0);
      setCarryDaysInput('0');
    } else {
      setCarryDays(num);
      setCarryDaysInput(String(num));
    }
  }, [carryDaysInput]);

  // 연도 변경 핸들러
  const handleYearDecrement = useCallback(() => {
    setYear((prev) => Math.max(2000, prev - 1));
  }, []);

  const handleYearIncrement = useCallback(() => {
    setYear((prev) => Math.min(2100, prev + 1));
  }, []);

  // 연차 사용내역 핸들러
  const handleAddAnnualLeave = useCallback((record: AnnualLeaveRecord) => {
    setAnnualLeaveRecords((prev) => {
      const newRecords = [...prev, record];
      return newRecords.sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const handleRemoveAnnualLeave = useCallback((id: string) => {
    if (!window.confirm('해당 연차 사용내역을 삭제하시겠습니까?')) {
      return;
    }
    setAnnualLeaveRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // 페이지 배경 클릭 시 캘린더 선택 해제
  const handlePageBackgroundClick = useCallback(() => {
    setClearSelectionSignal((prev) => prev + 1);
  }, []);

  // 경조휴가 섹션 토글 핸들러
  const handleToggleEventLeave = useCallback(() => {
    setEventLeaveExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(EVENT_LEAVE_EXPANDED_KEY, String(next));
      return next;
    });
  }, []);

  // 경조휴가 핸들러
  const handleAddEventLeave = useCallback((record: EventLeaveRecord) => {
    setEventLeaveRecords((prev) => {
      const newRecords = [...prev, record];
      return newRecords.sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const handleRemoveEventLeave = useCallback((id: string) => {
    if (!window.confirm('해당 경조휴가 내역을 삭제하시겠습니까?')) {
      return;
    }
    setEventLeaveRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleUpdateEventLeave = useCallback(
    (id: string, updates: Partial<EventLeaveRecord>) => {
      setEventLeaveRecords((prev) => {
        const updated = prev.map((r) => {
          if (r.id !== id) return r;
          const newRecord = { ...r, ...updates };
          if (updates.date) {
            const workingDays = calculateWorkingDays(updates.date, newRecord.calendarDays, holidaysSet);
            return { ...newRecord, workingDays };
          }
          return newRecord;
        });
        return updated.sort((a, b) => a.date.localeCompare(b.date));
      });
    },
    [holidaysSet]
  );

  // 공휴일 변경 시 경조휴가 근무일 재계산
  useEffect(() => {
    if (!isHydrated) return;

    setEventLeaveRecords((prev) =>
      prev.map((record) => {
        const workingDays = calculateWorkingDays(record.date, record.calendarDays, holidaysSet);
        if (workingDays !== record.workingDays) {
          return { ...record, workingDays };
        }
        return record;
      })
    );
  }, [holidaysSet, isHydrated]);

  // 수동 저장
  const handleManualSave = useCallback(() => {
    const payload = {
      year,
      hireDate,
      carryDays,
      annualLeaveRecords,
      eventLeaveRecords,
      holidays,
    };
    localStorage.setItem(getStorageKey(year), JSON.stringify(payload));
    if (hireDate) {
      localStorage.setItem(HIRE_DATE_KEY, hireDate);
    }
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SAVED_AT_KEY, now);
    setLastSavedAt(now);
    window.alert('저장되었습니다');
  }, [year, hireDate, carryDays, annualLeaveRecords, eventLeaveRecords, holidays]);

  // 전체 초기화
  const handleYearReset = useCallback(() => {
    if (window.confirm('모든 연차 및 사용내역을 초기화합니다.\n되돌릴 수 없습니다. 계속하시겠습니까?')) {
      localStorage.removeItem(getStorageKey(year));
      setCarryDays(0);
      setCarryDaysInput('0');
      setAnnualLeaveRecords([]);
      setEventLeaveRecords([]);
      setHolidays(getDefaultHolidays(year));
    }
  }, [year]);

  // 계산된 값들
  const annualUsedHoursTotal = useMemo(() => {
    return annualLeaveRecords.reduce((sum, r) => sum + r.amountHours, 0);
  }, [annualLeaveRecords]);

  const eventLeaveWorkingDaysTotal = useMemo(() => {
    return eventLeaveRecords.reduce((sum, r) => sum + r.workingDays, 0);
  }, [eventLeaveRecords]);

  const eventLeaveCalendarDaysTotal = useMemo(() => {
    return eventLeaveRecords.reduce((sum, r) => sum + r.calendarDays, 0);
  }, [eventLeaveRecords]);

  // YEAR_REMAIN 계산 결과
  const yearRemainResult = useMemo(() => {
    if (!hireDate) {
      return { result: null, errors: [], warnings: [] };
    }

    const input = {
      year,
      hireDate,
      carryDays,
      workHoursPerDay: WORK_HOURS_PER_DAY,
      annualLeaveRecords,
      policyConfig,
    };

    const validation = validateYearRemainInput(input);
    if (!validation.isValid) {
      return { result: null, errors: validation.errors, warnings: validation.warnings };
    }

    try {
      const result = calculateYearRemain(input);
      const warnings = [...validation.warnings];
      if (result.remainingHours < 0) {
        warnings.push('잔여 연차가 음수입니다. 보유량을 초과하여 사용했습니다.');
      }
      return { result, errors: [], warnings };
    } catch (e) {
      return { result: null, errors: [(e as Error).message], warnings: [] };
    }
  }, [year, hireDate, carryDays, annualLeaveRecords]);

  return (
    <div className="app" translate="no" onClick={handlePageBackgroundClick}>
      <header className="app-header" onClick={(e) => e.stopPropagation()}>
        <div className="header-content">
          <h1>연차 계산기</h1>
          <p className="subtitle">입사일 기준 연차 발생/사용/잔여 계산</p>
          <p className="disclaimer">
            ※ 개인 기록용으로 참고하시기 위한 계산기입니다.<br />
            실제 연차 적용 기준 및 일수는 회사 인사팀에 문의해 주세요.
          </p>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
        >
          {theme === 'light' ? '🌙' : '🌞'}
        </button>
      </header>

      <main className="app-main">
        {/* 상단 영역: 입사일 | 이월연차 */}
        <div className="top-info-row compact" onClick={(e) => e.stopPropagation()}>
          <div className="top-info-col">
            <label className="input-label">
              입사일
              <input
                type="date"
                value={hireDate}
                onChange={(e) => {
                  setHireDate(e.target.value);
                  setHireDateError('');
                }}
                className="input-field"
              />
              {hireDateError && <span className="input-error">{hireDateError}</span>}
            </label>
          </div>
          <div className="top-info-col">
            <label className="input-label">
              이월 연차 (일)
              <input
                type="text"
                inputMode="decimal"
                value={carryDaysInput}
                onChange={handleCarryDaysChange}
                onBlur={handleCarryDaysBlur}
                className="input-field"
                placeholder="0"
              />
            </label>
          </div>
        </div>

        {/* 연도 선택 */}
        <div className="year-selector-section" onClick={(e) => e.stopPropagation()}>
          <div className="year-selector">
            <button
              type="button"
              className="btn-year-nav"
              onClick={handleYearDecrement}
              aria-label="이전 연도"
            >
              ◀
            </button>
            <span className="year-display">{year}년</span>
            <button
              type="button"
              className="btn-year-nav"
              onClick={handleYearIncrement}
              aria-label="다음 연도"
            >
              ▶
            </button>
          </div>
        </div>

        {/* 달력 (연차 빠른 추가 + 삭제 통합) */}
        <LeaveCalendar
          year={year}
          annualLeaveRecords={annualLeaveRecords}
          eventLeaveRecords={eventLeaveRecords}
          holidays={holidaysSet}
          workHoursPerDay={WORK_HOURS_PER_DAY}
          initialMonth={referenceDate ? parseInt(referenceDate.split('-')[1], 10) : undefined}
          onAddAnnualLeave={handleAddAnnualLeave}
          onRemoveAnnualLeave={handleRemoveAnnualLeave}
          clearSelectionSignal={clearSelectionSignal}
        />

        {/* 연차 현황 */}
        <section className="result-section year-status-section" onClick={(e) => e.stopPropagation()}>
          <div className="section-header-inline">
            <h3 className="section-title">{year}년 연차 현황</h3>
            <div className="header-actions-inline">
              <button type="button" className="btn-save-small" onClick={handleManualSave}>
                저장
              </button>
              <button type="button" className="btn-reset-small" onClick={handleYearReset}>
                초기화
              </button>
            </div>
          </div>
          {lastSavedAt && (
            <span className="last-saved-at-inline">
              저장: {formatLastSavedAt(lastSavedAt)}
            </span>
          )}

          <YearRemainDisplay
            result={yearRemainResult.result}
            errors={yearRemainResult.errors}
            warnings={yearRemainResult.warnings}
          />

          {/* 통합 요약 */}
          {yearRemainResult.result && (
            <div className="combined-summary">
              <h4>휴가 사용 요약</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="label">연차 사용</span>
                  <span className="value">
                    {formatHoursAsDaysHours(annualUsedHoursTotal, WORK_HOURS_PER_DAY)}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">경조휴가</span>
                  <span className="value">+{eventLeaveWorkingDaysTotal}일</span>
                </div>
                <div className="summary-item highlight">
                  <span className="label">총 휴가 사용</span>
                  <span className="value">
                    {hoursToDays(annualUsedHoursTotal, WORK_HOURS_PER_DAY) + eventLeaveWorkingDaysTotal}일
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 경조휴가 섹션 (접기/펼치기) */}
        <section className="result-section event-leave-section-main" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="event-leave-toggle-btn"
            onClick={handleToggleEventLeave}
            aria-expanded={eventLeaveExpanded}
          >
            <span className="toggle-title">
              경조휴가 입력/조회
              {eventLeaveRecords.length > 0 && (
                <span className="toggle-badge">{eventLeaveRecords.length}건</span>
              )}
            </span>
            <span className={`toggle-arrow ${eventLeaveExpanded ? 'expanded' : ''}`}>
              ▾
            </span>
          </button>

          {eventLeaveExpanded && (
            <div className="event-leave-content">
              <p className="section-desc">경조휴가는 연차 잔여에 영향을 주지 않습니다.</p>

              <EventLeaveSelector year={year} holidays={holidaysSet} onAdd={handleAddEventLeave} />

              {eventLeaveRecords.length > 0 && (
                <div className="event-records-list">
                  {/* PC: 테이블 */}
                  <table className="year-records-table event-records-table desktop-only">
                    <thead>
                      <tr>
                        <th>시작일</th>
                        <th>유형</th>
                        <th>규정</th>
                        <th>실제 반영</th>
                        <th>메모</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventLeaveRecords.map((record) => {
                        const { month: evtMonth, day: evtDay } = parseMonthDay(record.date);
                        return (
                          <tr key={record.id}>
                            <td>
                              <div className="inline-month-day-picker">
                                <select
                                  value={evtMonth}
                                  onChange={(e) => {
                                    const newMonth = parseInt(e.target.value);
                                    const maxDay = new Date(year, newMonth, 0).getDate();
                                    const newDay = evtDay > maxDay ? maxDay : evtDay;
                                    handleUpdateEventLeave(record.id, {
                                      date: formatToDateString(year, newMonth, newDay),
                                    });
                                  }}
                                  className="month-select-inline"
                                >
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <option key={m} value={m}>{m}월</option>
                                  ))}
                                </select>
                                <select
                                  value={evtDay}
                                  onChange={(e) => {
                                    handleUpdateEventLeave(record.id, {
                                      date: formatToDateString(year, evtMonth, parseInt(e.target.value)),
                                    });
                                  }}
                                  className="day-select-inline"
                                >
                                  {Array.from({ length: new Date(year, evtMonth, 0).getDate() }, (_, i) => i + 1).map((d) => (
                                    <option key={d} value={d}>{d}일</option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td><span className="event-title">{record.title}</span></td>
                            <td>
                              <span className="event-calendar-days">
                                {record.calendarDays}일
                                <span className="calendar-note">(휴일포함)</span>
                              </span>
                            </td>
                            <td>
                              <span className="event-working-days">
                                <strong>+{record.workingDays}일</strong>
                                <span className="working-note">(근무일)</span>
                              </span>
                            </td>
                            <td>
                              <input
                                type="text"
                                value={record.memo}
                                onChange={(e) => handleUpdateEventLeave(record.id, { memo: e.target.value })}
                                placeholder="메모"
                                className="memo-input"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleRemoveEventLeave(record.id)}
                                className="btn-remove"
                                aria-label="삭제"
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* 모바일: 카드형 */}
                  <div className="event-cards-mobile mobile-only">
                    {eventLeaveRecords.map((record) => (
                      <div key={record.id} className="event-card">
                        <div className="event-card-header">
                          <span className="event-card-date">{record.date.slice(5).replace('-', '/')}</span>
                          <span className="event-card-title">{record.title}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEventLeave(record.id)}
                            className="btn-remove-card"
                            aria-label="삭제"
                          >
                            ×
                          </button>
                        </div>
                        <div className="event-card-body">
                          <span className="event-card-actual">실제 반영: +{record.workingDays}일 (근무일)</span>
                        </div>
                        {record.memo && (
                          <div className="event-card-memo">{record.memo}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 합계 */}
                  <div className="year-summary event-summary">
                    <div className="event-summary-row">
                      <span className="total-label">경조휴가 실제 반영 합계</span>
                      <span className="total-value highlight">+{eventLeaveWorkingDaysTotal}일 (근무일)</span>
                    </div>
                    <div className="event-summary-row sub">
                      <span className="total-label">규정 달력일 합계</span>
                      <span className="total-value muted">{eventLeaveCalendarDaysTotal}일 (휴일 포함)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer" onClick={(e) => e.stopPropagation()}>
        <p className="creator-credit">제작자_JW · v{APP_VERSION}</p>
      </footer>
    </div>
  );
}

export default App;
