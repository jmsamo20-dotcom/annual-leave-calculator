import { useCallback } from 'react';
import type { AnnualLeaveRecord } from '../lib/calc/types';
import { WORK_HOURS_PER_DAY, HALF_DAY_HOURS } from '../lib/calc/constants';
import { getTodayString } from '../lib/calc/dateUtils';

interface QuickAnnualLeaveAddProps {
  year: number;
  onAdd: (record: AnnualLeaveRecord) => void;
  contextMemo?: string; // 경조사 연계 시 "신혼여행 추가" 등
}

export function QuickAnnualLeaveAdd({ year, onAdd, contextMemo }: QuickAnnualLeaveAddProps) {
  const handleAdd = useCallback(
    (hours: number, label: string) => {
      const today = getTodayString();
      const todayYear = parseInt(today.split('-')[0]);
      const defaultDate = todayYear === year ? today : `${year}-01-01`;

      const record: AnnualLeaveRecord = {
        id: `annual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'ANNUAL',
        date: defaultDate,
        amountHours: hours,
        memo: contextMemo ? `${contextMemo} (${label})` : label,
      };

      onAdd(record);
    },
    [year, onAdd, contextMemo]
  );

  return (
    <div className="quick-annual-add">
      <p className="quick-add-hint">휴가가 더 필요하신가요?</p>
      <div className="quick-add-buttons">
        <button
          type="button"
          className="btn-quick-annual"
          onClick={() => handleAdd(WORK_HOURS_PER_DAY, '연차 1일')}
        >
          + 연차 1일
        </button>
        <button
          type="button"
          className="btn-quick-annual"
          onClick={() => handleAdd(HALF_DAY_HOURS, '반차')}
        >
          + 반차
        </button>
        <button
          type="button"
          className="btn-quick-annual"
          onClick={() => handleAdd(1, '1시간')}
        >
          + 1시간
        </button>
      </div>
    </div>
  );
}
