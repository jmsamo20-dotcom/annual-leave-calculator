# 연차계산기 전체 소스코드 (Part 3 - Components)

## 13. src/components/MonthDayPicker.tsx
```tsx
import { useMemo } from 'react';

interface MonthDayPickerProps {
  year: number;
  month: number;
  day: number;
  onMonthChange: (month: number) => void;
  onDayChange: (day: number) => void;
  className?: string;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function MonthDayPicker({
  year,
  month,
  day,
  onMonthChange,
  onDayChange,
  className = '',
}: MonthDayPickerProps) {
  const daysInMonth = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const handleMonthChange = (newMonth: number) => {
    onMonthChange(newMonth);
    const maxDays = getDaysInMonth(year, newMonth);
    if (day > maxDays) {
      onDayChange(maxDays);
    }
  };

  const dayOptions = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  return (
    <div className={`month-day-picker ${className}`}>
      <select
        value={month}
        onChange={(e) => handleMonthChange(parseInt(e.target.value))}
        className="month-select"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>
            {m}월
          </option>
        ))}
      </select>
      <select
        value={day}
        onChange={(e) => onDayChange(parseInt(e.target.value))}
        className="day-select"
      >
        {dayOptions.map((d) => (
          <option key={d} value={d}>
            {d}일
          </option>
        ))}
      </select>
    </div>
  );
}

export function parseMonthDay(dateStr: string): { month: number; day: number } {
  if (!dateStr) {
    const today = new Date();
    return { month: today.getMonth() + 1, day: today.getDate() };
  }
  const parts = dateStr.split('-');
  return {
    month: parseInt(parts[1]) || 1,
    day: parseInt(parts[2]) || 1,
  };
}

export function formatToDateString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}
```

## 14. src/components/YearUsageRecordForm.tsx
```tsx
import { useState, useCallback } from 'react';
import type { UsageRecord, UsagePreset, UsageTag } from '../lib/calc/types';
import { presetToHours, getPresetMemo } from '../lib/calc/formatters';
import { MonthDayPicker, formatToDateString } from './MonthDayPicker';

interface YearUsageRecordFormProps {
  year: number;
  workHoursPerDay: number;
  onAdd: (record: UsageRecord) => void;
}

const PRESET_OPTIONS: { value: UsagePreset; label: string }[] = [
  { value: 'FULL_DAY', label: '연차(1일)' },
  { value: 'AM_HALF', label: '오전반차' },
  { value: 'PM_HALF', label: '오후반차' },
  { value: '3H', label: '시간연차(3h)' },
  { value: '2H', label: '시간연차(2h)' },
  { value: '1H', label: '시간연차(1h)' },
];

function presetToTag(preset: UsagePreset): UsageTag {
  switch (preset) {
    case '1H':
    case '2H':
    case '3H':
      return 'HOUR';
    case 'AM_HALF':
      return 'AM_HALF';
    case 'PM_HALF':
      return 'PM_HALF';
    case 'FULL_DAY':
    default:
      return 'FULL_DAY';
  }
}

export function YearUsageRecordForm({
  year,
  workHoursPerDay,
  onAdd,
}: YearUsageRecordFormProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const initialMonth = currentYear === year ? today.getMonth() + 1 : 1;
  const initialDay = currentYear === year ? today.getDate() : 1;

  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);
  const [preset, setPreset] = useState<UsagePreset>('FULL_DAY');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  const hours = presetToHours(preset, workHoursPerDay);

  const handlePresetChange = useCallback((newPreset: UsagePreset) => {
    setPreset(newPreset);
    setMemo(getPresetMemo(newPreset));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (hours <= 0 || !Number.isInteger(hours)) {
      setError('사용시간은 1 이상의 정수여야 합니다.');
      return;
    }

    const date = formatToDateString(year, month, day);

    const record: UsageRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date,
      amountHours: hours,
      memo: memo || getPresetMemo(preset),
      tag: presetToTag(preset),
    };

    onAdd(record);

    setPreset('FULL_DAY');
    setMemo('');
  };

  return (
    <form className="year-usage-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          날짜
          <MonthDayPicker
            year={year}
            month={month}
            day={day}
            onMonthChange={setMonth}
            onDayChange={setDay}
          />
        </label>

        <label>
          유형
          <select
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value as UsagePreset)}
          >
            {PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          메모
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 병원, 개인용무"
          />
        </label>

        <button type="submit" className="btn-add">
          추가
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}
    </form>
  );
}
```

## 15. src/components/YearRemainDisplay.tsx
```tsx
import type { YearRemainResult } from '../lib/calc';

interface YearRemainDisplayProps {
  result: YearRemainResult | null;
  errors: string[];
  warnings: string[];
}

export function YearRemainDisplay({ result, errors, warnings }: YearRemainDisplayProps) {
  if (errors.length > 0) {
    return (
      <div className="result-display error">
        <h3>오류</h3>
        <ul>
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="result-display empty">
        <p>입력값을 입력하면 결과가 표시됩니다.</p>
      </div>
    );
  }

  const {
    tenureYears,
    yearlyGrantDays,
    yearlyGrantHours,
    carryDays,
    carryHours,
    availableHours,
    usedHours,
    remainingHours,
    availablePretty,
    usedPretty,
    remainingPretty,
  } = result;

  const remainingDays = remainingHours / 8;
  const showFunMessage = remainingDays >= 0 && remainingDays <= 2;

  let funMessage = '';
  if (showFunMessage) {
    const displayDays = Math.floor(remainingDays);
    const displayHours = Math.round((remainingDays - displayDays) * 8);

    if (displayDays === 0 && displayHours === 0) {
      funMessage = '아이구… 연차가 없네?';
    } else {
      funMessage = `아이구… ${displayDays}일 ${displayHours}시간이나 남았네…`;
    }
  }

  return (
    <div className="result-display">
      <p className="tenure-info">근속 {tenureYears}년차</p>

      {warnings.length > 0 && (
        <div className="warnings-section">
          <h4>주의</h4>
          <ul>
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {remainingHours < 0 && (
        <div className="warnings-section">
          <h4>경고</h4>
          <ul>
            <li>잔여 연차가 음수입니다. 초과 사용 상태입니다.</li>
          </ul>
        </div>
      )}

      <div className="year-result-grid">
        <div className="result-row">
          <div className="result-item">
            <span className="label">올해 발생</span>
            <span className="value">{yearlyGrantDays}일</span>
            <span className="sub-value">({yearlyGrantHours}시간)</span>
          </div>

          <div className="result-item">
            <span className="label">이월</span>
            <span className="value">{carryDays}일</span>
            <span className="sub-value">({carryHours}시간)</span>
          </div>

          <div className="result-item accent">
            <span className="label">보유</span>
            <span className="value">{availablePretty}</span>
            <span className="sub-value">({availableHours}시간)</span>
          </div>
        </div>

        <div className="result-divider">
          <span>사용 현황</span>
        </div>

        <div className="result-row">
          <div className="result-item">
            <span className="label">사용</span>
            <span className="value">{usedPretty}</span>
            <span className="sub-value">({usedHours}시간)</span>
          </div>

          <div className={`result-item highlight ${remainingHours < 0 ? 'negative-bg' : ''}`}>
            <span className="label">잔여</span>
            <span className={`value ${remainingHours < 0 ? 'negative' : ''}`}>
              {remainingPretty}
            </span>
            <span className={`sub-value ${remainingHours < 0 ? 'negative' : ''}`}>
              ({remainingHours}시간)
            </span>
          </div>
        </div>
      </div>

      {showFunMessage && funMessage && (
        <p className="fun-message">{funMessage}</p>
      )}
    </div>
  );
}
```

## 16. src/components/EventLeaveSelector.tsx
```tsx
import { useState, useCallback, useMemo } from 'react';
import type { EventLeaveRecord, EventLeaveType } from '../lib/calc/types';
import { EVENT_LEAVE_POLICIES, getEventLeavePolicy } from '../lib/calc/constants';
import { calculateWorkingDays, getEndDate } from '../lib/calc/workingDays';
import { MonthDayPicker, formatToDateString } from './MonthDayPicker';

interface EventLeaveSelectorProps {
  year: number;
  holidays: Set<string>;
  onAdd: (record: EventLeaveRecord) => void;
}

export function EventLeaveSelector({ year, holidays, onAdd }: EventLeaveSelectorProps) {
  const [selectedType, setSelectedType] = useState<EventLeaveType | ''>('');

  const today = new Date();
  const currentYear = today.getFullYear();
  const initialMonth = currentYear === year ? today.getMonth() + 1 : 1;
  const initialDay = currentYear === year ? today.getDate() : 1;

  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);

  const startDate = useMemo(() => {
    return formatToDateString(year, month, day);
  }, [year, month, day]);

  const selectedPolicy = useMemo(() => {
    if (!selectedType) return null;
    return getEventLeavePolicy(selectedType);
  }, [selectedType]);

  const preview = useMemo(() => {
    if (!selectedPolicy) return null;

    const workingDays = calculateWorkingDays(startDate, selectedPolicy.calendarDays, holidays);
    const endDate = getEndDate(startDate, selectedPolicy.calendarDays);

    return {
      calendarDays: selectedPolicy.calendarDays,
      workingDays,
      startDate,
      endDate,
    };
  }, [selectedPolicy, startDate, holidays]);

  const handleAddEventLeave = useCallback(() => {
    if (!selectedPolicy || !preview) return;

    const record: EventLeaveRecord = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'EVENT',
      date: startDate,
      eventType: selectedPolicy.type,
      title: selectedPolicy.title,
      calendarDays: selectedPolicy.calendarDays,
      workingDays: preview.workingDays,
      memo: '',
    };

    onAdd(record);
    setSelectedType('');
  }, [selectedPolicy, startDate, preview, onAdd]);

  return (
    <div className="event-leave-selector">
      <div className="event-form-row">
        <label className="event-form-label">
          경조사유
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as EventLeaveType | '')}
            className="event-select"
          >
            <option value="">-- 선택 --</option>
            <optgroup label="결혼">
              {EVENT_LEAVE_POLICIES.filter((p) => p.category === 'MARRIAGE').map((policy) => (
                <option key={policy.type} value={policy.type}>
                  {policy.title} ({policy.calendarDays}일·{policy.note})
                </option>
              ))}
            </optgroup>
            <optgroup label="사망">
              {EVENT_LEAVE_POLICIES.filter((p) => p.category === 'DEATH').map((policy) => (
                <option key={policy.type} value={policy.type}>
                  {policy.title} ({policy.calendarDays}일·{policy.note})
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="event-form-label">
          시작일
          <MonthDayPicker
            year={year}
            month={month}
            day={day}
            onMonthChange={setMonth}
            onDayChange={setDay}
            className="event-date-picker"
          />
        </label>

        <button
          type="button"
          className="btn-add-event"
          onClick={handleAddEventLeave}
          disabled={!selectedType}
        >
          추가
        </button>
      </div>

      {preview && (
        <div className="event-preview">
          <div className="preview-header">
            <strong>{selectedPolicy?.title}</strong>
          </div>
          <div className="preview-details">
            <div className="preview-item">
              <span className="preview-label">규정:</span>
              <span className="preview-value policy">{preview.calendarDays}일 (휴일 포함)</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">기간:</span>
              <span className="preview-value">{preview.startDate} ~ {preview.endDate}</span>
            </div>
            <div className="preview-item highlight">
              <span className="preview-label">실제 반영:</span>
              <span className="preview-value actual">
                근무일 기준 <strong>+{preview.workingDays}일</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      <p className="event-notice">
        ※ 경조휴가는 휴일 포함 달력일 기준이며, 실제 반영은 근무일(주말·공휴일 제외) 기준으로 자동 계산됩니다.
      </p>
    </div>
  );
}
```

## 17. src/components/HolidayManager.tsx
```tsx
import { useState, useCallback } from 'react';
import {
  getKoreanPublicHolidaysPreset,
  mergeUniqueSorted,
  isSupportedYear,
  getHolidayName,
  SUPPORTED_HOLIDAY_YEARS,
} from '../lib/holidays';

interface HolidayManagerProps {
  year: number;
  holidays: string[];
  onAdd: (date: string) => void;
  onRemove: (date: string) => void;
  onBulkAdd: (dates: string[]) => void;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function getDayName(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return DAY_NAMES[date.getDay()];
}

export function HolidayManager({ year, holidays, onAdd, onRemove, onBulkAdd }: HolidayManagerProps) {
  const [newDate, setNewDate] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [includeLaborDay, setIncludeLaborDay] = useState(false);
  const [presetMessage, setPresetMessage] = useState<string | null>(null);

  const handleAdd = useCallback(() => {
    if (!newDate) return;

    if (holidays.includes(newDate)) {
      alert('이미 등록된 공휴일입니다.');
      return;
    }

    onAdd(newDate);
    setNewDate('');
  }, [newDate, holidays, onAdd]);

  const handleApplyPreset = useCallback(() => {
    setPresetMessage(null);

    if (!isSupportedYear(year)) {
      setPresetMessage(`${year}년 공휴일 프리셋은 아직 지원하지 않습니다.`);
      return;
    }

    const preset = getKoreanPublicHolidaysPreset(year, includeLaborDay);
    if (!preset) {
      setPresetMessage('공휴일 데이터를 불러올 수 없습니다.');
      return;
    }

    const merged = mergeUniqueSorted(holidays, preset);
    const addedCount = merged.length - holidays.length;

    onBulkAdd(merged);

    if (addedCount > 0) {
      setPresetMessage(`${addedCount}개의 공휴일이 추가되었습니다.`);
    } else {
      setPresetMessage('추가할 새 공휴일이 없습니다. (모두 이미 등록됨)');
    }

    setTimeout(() => setPresetMessage(null), 3000);
  }, [year, includeLaborDay, holidays, onBulkAdd]);

  const sortedHolidays = [...holidays].sort();

  return (
    <div className="holiday-manager">
      <button
        type="button"
        className="holiday-toggle-btn"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        공휴일 설정 ({holidays.length}개)
        <span className={`toggle-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {isExpanded && (
        <div className="holiday-content">
          <div className="holiday-preset-section">
            <h5 className="preset-title">국가공휴일 자동 적용</h5>

            <div className="preset-controls">
              <div className="preset-year-row">
                <label className="preset-year-label">
                  연도:
                  <select value={year} disabled className="preset-year-select">
                    <option value={year}>{year}년</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="btn-apply-preset"
                  onClick={handleApplyPreset}
                  disabled={!isSupportedYear(year)}
                >
                  {year}년 국가공휴일 적용
                </button>
              </div>

              <label className="preset-option">
                <input
                  type="checkbox"
                  checked={includeLaborDay}
                  onChange={(e) => setIncludeLaborDay(e.target.checked)}
                />
                <span>근로자의 날(5/1) 포함</span>
                <span className="option-hint">(회사마다 다름)</span>
              </label>

              {!isSupportedYear(year) && (
                <p className="preset-unsupported">
                  {year}년 공휴일 프리셋은 아직 지원하지 않습니다.
                  (지원 연도: {SUPPORTED_HOLIDAY_YEARS.join(', ')})
                </p>
              )}

              {presetMessage && (
                <p className={`preset-message ${presetMessage.includes('추가') ? 'success' : 'info'}`}>
                  {presetMessage}
                </p>
              )}
            </div>

            <p className="preset-notice">
              국가공휴일 자동 적용은 '근무일 계산(연차 차감)' 정확도를 높이기 위한 기능입니다.
              <br />
              경조휴가의 '휴일 포함 규정일수' 자체를 변경하지는 않습니다.
            </p>
          </div>

          <hr className="holiday-divider" />

          <div className="holiday-manual-section">
            <h5 className="manual-title">수동 추가</h5>
            <div className="holiday-form">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={`${year}-01-01`}
                max={`${year}-12-31`}
                className="holiday-date-input"
              />
              <button
                type="button"
                className="btn-add-holiday"
                onClick={handleAdd}
                disabled={!newDate}
              >
                추가
              </button>
            </div>
          </div>

          <div className="holiday-list-section">
            <h5 className="list-title">등록된 공휴일 ({sortedHolidays.length}개)</h5>
            {sortedHolidays.length > 0 ? (
              <ul className="holiday-list">
                {sortedHolidays.map((date) => {
                  const holidayName = getHolidayName(date, year);
                  return (
                    <li key={date} className="holiday-item">
                      <span className="holiday-date">
                        {date} ({getDayName(date)})
                        {holidayName && <span className="holiday-name">{holidayName}</span>}
                      </span>
                      <button
                        type="button"
                        className="btn-remove-holiday"
                        onClick={() => onRemove(date)}
                        aria-label={`${date} 삭제`}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="holiday-empty">등록된 공휴일이 없습니다.</p>
            )}
          </div>

          <p className="holiday-notice">
            ※ 공휴일은 경조휴가 근무일 계산 시 제외됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
```
