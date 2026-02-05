import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  calculateYearRemain,
  validateYearRemainInput,
  WORK_HOURS_PER_DAY,
} from './lib/calc';
import type {
  UsageRecord,
  PolicyConfig,
  AnnualLeaveRecord,
  EventLeaveRecord,
} from './lib/calc';
import { getTodayString } from './lib/calc/dateUtils';
import { hoursToDays, formatHoursAsDaysHours, getLeaveTypeLabel } from './lib/calc/formatters';
import { YearRemainDisplay } from './components/YearRemainDisplay';
import { YearUsageRecordForm } from './components/YearUsageRecordForm';
import { EventLeaveSelector } from './components/EventLeaveSelector';
import { HolidayManager } from './components/HolidayManager';
import { LeaveCalendar } from './components/LeaveCalendar';
import { calculateWorkingDays } from './lib/calc/workingDays';
import { parseMonthDay, formatToDateString } from './components/MonthDayPicker';
import './App.css';

// 앱 버전
const APP_VERSION = '1.0.0';

// 테마 타입 및 localStorage 키
type Theme = 'light' | 'dark';
const THEME_KEY = 'theme';

// 초기 테마 결정 함수
function getInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }
  // OS 선호 테마 확인
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

// 새로운 탭 타입 (연차현황 vs 사용내역/경조휴가)
type ViewTab = 'status' | 'records';

// 통합 저장 데이터 구조 (변경 없음)
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

const getStorageKey = (year: number) => `annual_leave_year_${year}`;

// 마지막 저장 시각 포맷팅 (YYYY.MM.DD.HH:mm)
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

// 기존 데이터 마이그레이션 (구 형식 -> 신 형식) - 변경 없음
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

  // 테마 변경 시 DOM 및 localStorage 업데이트
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // 테마 토글 핸들러
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // 새 탭 상태: 연차현황 vs 사용내역/경조휴가
  const [viewTab, setViewTab] = useState<ViewTab>('status');

  // 공통 입력값 - 입사일 (변경 없음)
  const [hireDate, setHireDate] = useState<string>('');
  const [hireDateError, setHireDateError] = useState('');
  const policyConfig: PolicyConfig = { type: 'DEFAULT' };

  // YEAR_REMAIN 모드 입력값 (변경 없음)
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [carryDays, setCarryDays] = useState<number>(0);
  const [referenceDate, setReferenceDate] = useState<string>(getTodayString()); // 기준일(현재일)
  const [annualLeaveRecords, setAnnualLeaveRecords] = useState<AnnualLeaveRecord[]>([]);
  const [eventLeaveRecords, setEventLeaveRecords] = useState<EventLeaveRecord[]>([]);
  const [holidays, setHolidays] = useState<string[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(() => localStorage.getItem(LAST_SAVED_AT_KEY));

  const holidaysSet = useMemo(() => new Set(holidays), [holidays]);

  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // [1] 불러오기 (변경 없음)
  useEffect(() => {
    setIsHydrated(false);

    const raw = localStorage.getItem(getStorageKey(year));
    const parsed = safeParse<Record<string, unknown>>(raw);
    const saved = parsed ? migrateOldData(parsed) : null;

    if (saved) {
      setCarryDays(saved.carryDays ?? 0);
      setAnnualLeaveRecords(Array.isArray(saved.annualLeaveRecords) ? saved.annualLeaveRecords : []);
      setEventLeaveRecords(Array.isArray(saved.eventLeaveRecords) ? saved.eventLeaveRecords : []);
      setHolidays(Array.isArray(saved.holidays) ? saved.holidays : []);
      if (saved.hireDate) {
        setHireDate(saved.hireDate);
      }
    } else {
      setCarryDays(0);
      setAnnualLeaveRecords([]);
      setEventLeaveRecords([]);
      setHolidays([]);
    }

    const savedHireDate = localStorage.getItem(HIRE_DATE_KEY);
    if (savedHireDate && !saved?.hireDate) {
      setHireDate(savedHireDate);
    }

    setIsHydrated(true);
  }, [year]);

  // [2] 저장 (변경 없음)
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

  // 연도 변경 핸들러 (변경 없음)
  const handleYearDecrement = useCallback(() => {
    setYear((prev) => Math.max(2000, prev - 1));
  }, []);

  const handleYearIncrement = useCallback(() => {
    setYear((prev) => Math.min(2100, prev + 1));
  }, []);

  // 연차 사용내역 핸들러 (변경 없음)
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

  const handleUpdateAnnualLeave = useCallback(
    (id: string, updates: Partial<AnnualLeaveRecord>) => {
      setAnnualLeaveRecords((prev) => {
        const updated = prev.map((r) => (r.id === id ? { ...r, ...updates } : r));
        return updated.sort((a, b) => a.date.localeCompare(b.date));
      });
    },
    []
  );

  // 경조휴가 핸들러 (변경 없음)
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

  // 공휴일 핸들러 (변경 없음)
  const handleAddHoliday = useCallback((date: string) => {
    setHolidays((prev) => {
      if (prev.includes(date)) return prev;
      return [...prev, date].sort();
    });
  }, []);

  const handleRemoveHoliday = useCallback((date: string) => {
    setHolidays((prev) => prev.filter((d) => d !== date));
  }, []);

  const handleBulkAddHolidays = useCallback((dates: string[]) => {
    setHolidays(dates);
  }, []);

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

  // 수동 저장하기
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
      setAnnualLeaveRecords([]);
      setEventLeaveRecords([]);
      setHolidays([]);
    }
  }, [year]);

  // YearUsageRecordForm 호환용 핸들러
  const handleYearAddRecordCompat = useCallback(
    (record: UsageRecord) => {
      const annualRecord: AnnualLeaveRecord = {
        id: record.id,
        type: 'ANNUAL',
        date: record.date,
        amountHours: record.amountHours,
        memo: record.memo,
      };
      handleAddAnnualLeave(annualRecord);
    },
    [handleAddAnnualLeave]
  );

  // 계산된 값들 (변경 없음)
  const annualUsedHoursTotal = useMemo(() => {
    return annualLeaveRecords.reduce((sum, r) => sum + r.amountHours, 0);
  }, [annualLeaveRecords]);

  const eventLeaveWorkingDaysTotal = useMemo(() => {
    return eventLeaveRecords.reduce((sum, r) => sum + r.workingDays, 0);
  }, [eventLeaveRecords]);

  const eventLeaveCalendarDaysTotal = useMemo(() => {
    return eventLeaveRecords.reduce((sum, r) => sum + r.calendarDays, 0);
  }, [eventLeaveRecords]);

  // YEAR_REMAIN 계산 결과 (변경 없음)
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
    <div className="app" translate="no">
      <header className="app-header">
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
            {/* 새 탭 버튼 */}
            <div className="view-tabs">
              <button
                className={viewTab === 'status' ? 'active' : ''}
                onClick={() => setViewTab('status')}
              >
                연차 현황
              </button>
              <button
                className={viewTab === 'records' ? 'active' : ''}
                onClick={() => setViewTab('records')}
              >
                사용내역 / 경조휴가
              </button>
            </div>

            {/* 탭1: 연차 현황 */}
            {viewTab === 'status' && (
              <section className="tab-content">
                {/* 상단 영역: 3컬럼 (입사일 | 기준일 | 이월연차) */}
                <div className="top-info-row">
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
                      캘린더 기준일(월 표시용)
                      <input
                        type="date"
                        value={referenceDate}
                        onChange={(e) => setReferenceDate(e.target.value)}
                        className="input-field"
                      />
                    </label>
                  </div>
                  <div className="top-info-col top-info-col-carry">
                    <label className="input-label">
                      이월 연차 (일)
                      <input
                        type="number"
                        value={carryDays}
                        onChange={(e) => setCarryDays(parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.5"
                        className="input-field"
                      />
                    </label>
                  </div>
                </div>

                {/* 연도 선택 */}
                <div className="year-selector-section">
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

                {/* 달력 */}
                <LeaveCalendar
                  year={year}
                  annualLeaveRecords={annualLeaveRecords}
                  eventLeaveRecords={eventLeaveRecords}
                  holidays={holidaysSet}
                  workHoursPerDay={WORK_HOURS_PER_DAY}
                  initialMonth={referenceDate ? parseInt(referenceDate.split('-')[1], 10) : undefined}
                />

                {/* YYYY년 연차 현황 */}
                <section className="result-section year-status-section">
                  <h3 className="section-title">{year}년 연차 현황</h3>
                  <YearRemainDisplay
                    result={yearRemainResult.result}
                    errors={yearRemainResult.errors}
                    warnings={yearRemainResult.warnings}
                  />

                  {/* 통합 요약 */}
                  {yearRemainResult.result && (
                    <div className="combined-summary">
                      <h4>휴가 사용 요약 (참고용)</h4>
                      <div className="summary-grid">
                        <div className="summary-item">
                          <span className="label">연차 사용</span>
                          <span className="value">
                            {formatHoursAsDaysHours(annualUsedHoursTotal, WORK_HOURS_PER_DAY)}
                          </span>
                        </div>
                        <div className="summary-item">
                          <span className="label">경조휴가 (근무일)</span>
                          <span className="value">+{eventLeaveWorkingDaysTotal}일</span>
                        </div>
                        <div className="summary-item highlight">
                          <span className="label">총 휴가 사용</span>
                          <span className="value">
                            {hoursToDays(annualUsedHoursTotal, WORK_HOURS_PER_DAY) + eventLeaveWorkingDaysTotal}일
                          </span>
                        </div>
                      </div>
                      <p className="summary-note">
                        ※ 총 휴가 사용은 연차 + 경조휴가(근무일 기준) 합산입니다.<br />
                        ※ 연차 잔여 계산에는 경조휴가가 포함되지 않습니다.
                      </p>
                    </div>
                  )}
                </section>
              </section>
            )}

            {/* 탭2: 사용내역 / 경조휴가 */}
            {viewTab === 'records' && (
              <section className="tab-content">
                {/* 연차 사용내역 섹션 */}
                <div className="usage-section">
                  <div className="section-header">
                    <h3>연차 사용내역</h3>
                    <div className="header-actions">
                      <button type="button" className="btn-save" onClick={handleManualSave}>
                        저장하기
                      </button>
                      <button type="button" className="btn-reset" onClick={handleYearReset}>
                        전체 초기화
                      </button>
                    </div>
                    {lastSavedAt && (
                      <span className="last-saved-at">
                        저장된시간 {formatLastSavedAt(lastSavedAt)}
                      </span>
                    )}
                  </div>

                  <YearUsageRecordForm
                    year={year}
                    workHoursPerDay={WORK_HOURS_PER_DAY}
                    onAdd={handleYearAddRecordCompat}
                  />

                  {annualLeaveRecords.length > 0 ? (
                    <>
                      <table className="year-records-table annual-records-table">
                        <thead>
                          <tr>
                            <th>날짜</th>
                            <th>유형</th>
                            <th>메모</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {annualLeaveRecords.map((record) => {
                            const { month: recMonth, day: recDay } = parseMonthDay(record.date);
                            return (
                            <tr key={record.id}>
                              <td>
                                <div className="inline-month-day-picker">
                                  <select
                                    value={recMonth}
                                    onChange={(e) => {
                                      const newMonth = parseInt(e.target.value);
                                      const maxDay = new Date(year, newMonth, 0).getDate();
                                      const newDay = recDay > maxDay ? maxDay : recDay;
                                      handleUpdateAnnualLeave(record.id, {
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
                                    value={recDay}
                                    onChange={(e) => {
                                      handleUpdateAnnualLeave(record.id, {
                                        date: formatToDateString(year, recMonth, parseInt(e.target.value)),
                                      });
                                    }}
                                    className="day-select-inline"
                                  >
                                    {Array.from({ length: new Date(year, recMonth, 0).getDate() }, (_, i) => i + 1).map((d) => (
                                      <option key={d} value={d}>{d}일</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td>
                                <span className="leave-type-label">
                                  {getLeaveTypeLabel(record.amountHours, WORK_HOURS_PER_DAY, record.memo)}
                                </span>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={record.memo}
                                  onChange={(e) =>
                                    handleUpdateAnnualLeave(record.id, { memo: e.target.value })
                                  }
                                  placeholder="메모"
                                  className="memo-input"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAnnualLeave(record.id)}
                                  className="btn-remove"
                                  aria-label="삭제"
                                  title="삭제"
                                >
                                  <span className="btn-remove-text">삭제</span>
                                  <span className="btn-remove-icon">&times;</span>
                                </button>
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                      <div className="year-summary">
                        <span className="total-label">연차 사용 합계</span>
                        <span className="total-value">
                          {formatHoursAsDaysHours(annualUsedHoursTotal, WORK_HOURS_PER_DAY)} ({annualUsedHoursTotal}시간)
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="empty-records">아직 연차 사용내역이 없습니다.</div>
                  )}
                </div>

                {/* 경조휴가 섹션 */}
                <div className="usage-section event-leave-section">
                  <h3>경조휴가</h3>
                  <p className="section-desc">경조휴가는 연차 잔여에 영향을 주지 않습니다.</p>

                  {/* 공휴일 설정 */}
                  <HolidayManager
                    year={year}
                    holidays={holidays}
                    onAdd={handleAddHoliday}
                    onRemove={handleRemoveHoliday}
                    onBulkAdd={handleBulkAddHolidays}
                  />

                  <EventLeaveSelector year={year} holidays={holidaysSet} onAdd={handleAddEventLeave} />

                  {eventLeaveRecords.length > 0 && (
                    <>
                      <table className="year-records-table event-records-table">
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
                              <td>
                                <span className="event-title">{record.title}</span>
                              </td>
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
                                  onChange={(e) =>
                                    handleUpdateEventLeave(record.id, { memo: e.target.value })
                                  }
                                  placeholder="메모"
                                  className="memo-input"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEventLeave(record.id)}
                                  className="btn-remove"
                                >
                                  삭제
                                </button>
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                      <div className="year-summary event-summary">
                        <div className="event-summary-row">
                          <span className="total-label">경조휴가 실제 반영 합계</span>
                          <span className="total-value highlight">+{eventLeaveWorkingDaysTotal}일 (근무일 기준)</span>
                        </div>
                        <div className="event-summary-row sub">
                          <span className="total-label">규정 달력일 합계</span>
                          <span className="total-value muted">{eventLeaveCalendarDaysTotal}일 (휴일 포함)</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            )}
      </main>

      <footer className="app-footer">
        <p className="creator-credit">제작자_JW · v{APP_VERSION}</p>
      </footer>
    </div>
  );
}

export default App;
