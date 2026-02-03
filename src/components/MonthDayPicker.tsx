import { useMemo } from 'react';

interface MonthDayPickerProps {
  year: number;
  month: number;
  day: number;
  onMonthChange: (month: number) => void;
  onDayChange: (day: number) => void;
  className?: string;
}

// 해당 연도/월의 일수 계산
function getDaysInMonth(year: number, month: number): number {
  // month는 1-12 기준
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

  // 월 변경 시 일이 범위를 초과하면 조정
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

// 유틸리티 함수들
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
