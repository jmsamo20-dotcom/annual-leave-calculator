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
  // 오늘 날짜 기준 초기값 (해당 연도 범위 내)
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

    // 날짜 조합 (연도는 prop에서 받은 year 사용)
    const date = formatToDateString(year, month, day);

    const record: UsageRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date,
      amountHours: hours,
      memo: memo || getPresetMemo(preset),
      tag: presetToTag(preset),
    };

    onAdd(record);

    // Reset form (날짜는 유지)
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
