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
  holidays: string[]; // YYYY-MM-DD 배열
  onAdd: (date: string) => void;
  onRemove: (date: string) => void;
  onBulkAdd: (dates: string[]) => void; // 여러 날짜 일괄 추가
}

// 요일 이름
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

    // 중복 체크
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

    // 기존 공휴일과 병합
    const merged = mergeUniqueSorted(holidays, preset);
    const addedCount = merged.length - holidays.length;

    // 부모에게 전체 목록 전달 (병합된 결과)
    onBulkAdd(merged);

    if (addedCount > 0) {
      setPresetMessage(`${addedCount}개의 공휴일이 추가되었습니다.`);
    } else {
      setPresetMessage('추가할 새 공휴일이 없습니다. (모두 이미 등록됨)');
    }

    // 메시지 3초 후 자동 삭제
    setTimeout(() => setPresetMessage(null), 3000);
  }, [year, includeLaborDay, holidays, onBulkAdd]);

  // 날짜순 정렬
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
          {/* 국가공휴일 자동 적용 섹션 */}
          <div className="holiday-preset-section">
            <h5 className="preset-title">국가공휴일 자동 적용</h5>

            <div className="preset-controls">
              <div className="preset-year-row">
                <label className="preset-year-label">
                  연도:
                  <select
                    value={year}
                    disabled
                    className="preset-year-select"
                  >
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

          {/* 수동 추가 섹션 */}
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

          {/* 등록된 공휴일 목록 */}
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
