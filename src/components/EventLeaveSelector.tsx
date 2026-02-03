import { useState, useCallback, useMemo } from 'react';
import type { EventLeaveRecord, EventLeaveType } from '../lib/calc/types';
import { EVENT_LEAVE_POLICIES, getEventLeavePolicy } from '../lib/calc/constants';
import { calculateWorkingDays, getEndDate } from '../lib/calc/workingDays';
import { MonthDayPicker, formatToDateString } from './MonthDayPicker';

interface EventLeaveSelectorProps {
  year: number;
  holidays: Set<string>; // 공휴일 목록 (YYYY-MM-DD)
  onAdd: (record: EventLeaveRecord) => void;
}

export function EventLeaveSelector({ year, holidays, onAdd }: EventLeaveSelectorProps) {
  const [selectedType, setSelectedType] = useState<EventLeaveType | ''>('');

  // 오늘 날짜 기준 초기값 (해당 연도 범위 내)
  const today = new Date();
  const currentYear = today.getFullYear();
  const initialMonth = currentYear === year ? today.getMonth() + 1 : 1;
  const initialDay = currentYear === year ? today.getDate() : 1;

  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);

  // 조합된 날짜 문자열
  const startDate = useMemo(() => {
    return formatToDateString(year, month, day);
  }, [year, month, day]);

  // 선택된 정책 정보
  const selectedPolicy = useMemo(() => {
    if (!selectedType) return null;
    return getEventLeavePolicy(selectedType);
  }, [selectedType]);

  // 근무일 계산 미리보기
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

    // 폼 초기화 (날짜는 유지)
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

      {/* 미리보기 */}
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

      {/* 안내문 */}
      <p className="event-notice">
        ※ 경조휴가는 휴일 포함 달력일 기준이며, 실제 반영은 근무일(주말·공휴일 제외) 기준으로 자동 계산됩니다.
      </p>
    </div>
  );
}
