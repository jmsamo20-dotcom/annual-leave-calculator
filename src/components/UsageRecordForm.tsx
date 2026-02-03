import { useState } from 'react';
import type { UsageRecord } from '../lib/calc';
import { getTodayString } from '../lib/calc/dateUtils';
import { daysToHours } from '../lib/calc/formatters';
import { QuickSetButtons } from './PresetButtons';

type InputUnit = 'hours' | 'days';

interface UsageRecordFormProps {
  workHoursPerDay: number;
  onAdd: (record: UsageRecord) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function UsageRecordForm({ workHoursPerDay, onAdd }: UsageRecordFormProps) {
  const [date, setDate] = useState(getTodayString());
  const [inputUnit, setInputUnit] = useState<InputUnit>('hours');
  const [amountValue, setAmountValue] = useState('8');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  const getAmountHours = (): number | null => {
    const value = parseFloat(amountValue);
    if (isNaN(value) || value <= 0) return null;

    if (inputUnit === 'hours') {
      if (!Number.isInteger(value)) {
        setError('시간은 정수로 입력해주세요.');
        return null;
      }
      return value;
    } else {
      const hours = daysToHours(value, workHoursPerDay);
      if (!Number.isInteger(hours)) {
        setError(`${workHoursPerDay}시간 기준 정수 시간으로 변환되지 않습니다.`);
        return null;
      }
      return hours;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const hours = getAmountHours();
    if (hours === null) return;

    onAdd({
      id: generateId(),
      date,
      amountHours: hours,
      memo,
    });

    // 폼 초기화
    setAmountValue(inputUnit === 'hours' ? String(workHoursPerDay) : '1');
    setMemo('');
  };

  const handleQuickSet = (hours: number) => {
    setError('');
    if (inputUnit === 'hours') {
      setAmountValue(String(hours));
    } else {
      setAmountValue(String(hours / workHoursPerDay));
    }
  };

  const handleUnitChange = (unit: InputUnit) => {
    setError('');
    const currentHours = getAmountHours();
    setInputUnit(unit);
    if (currentHours !== null) {
      if (unit === 'hours') {
        setAmountValue(String(currentHours));
      } else {
        setAmountValue(String(currentHours / workHoursPerDay));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="usage-record-form">
      <div className="form-row">
        <label>
          날짜
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <div className="amount-input-group">
          <label>
            사용량
            <div className="amount-with-unit">
              <input
                type="number"
                value={amountValue}
                onChange={(e) => {
                  setAmountValue(e.target.value);
                  setError('');
                }}
                step={inputUnit === 'hours' ? '1' : '0.5'}
                min={inputUnit === 'hours' ? '1' : '0.5'}
                required
              />
              <div className="unit-toggle-small">
                <button
                  type="button"
                  className={inputUnit === 'hours' ? 'active' : ''}
                  onClick={() => handleUnitChange('hours')}
                >
                  시간
                </button>
                <button
                  type="button"
                  className={inputUnit === 'days' ? 'active' : ''}
                  onClick={() => handleUnitChange('days')}
                >
                  일
                </button>
              </div>
            </div>
          </label>
          <QuickSetButtons
            workHoursPerDay={workHoursPerDay}
            onSetHours={handleQuickSet}
          />
        </div>
        <label>
          메모
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="(선택)"
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
