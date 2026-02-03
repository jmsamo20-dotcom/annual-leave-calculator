import type { CalculationResult } from '../lib/calc';

interface ResultDisplayProps {
  result: CalculationResult | null;
  errors: string[];
  warnings: string[];
}

export function ResultDisplay({ result, errors, warnings }: ResultDisplayProps) {
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
    servicePeriod,
    accruedHoursTotal,
    usedHoursTotal,
    remainingHours,
    accruedDaysTotal,
    usedDaysTotal,
    remainingDays,
    accruedPretty,
    usedPretty,
    remainingPretty,
  } = result;

  return (
    <div className="result-display">
      <h3>계산 결과</h3>

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

      <div className="result-grid">
        <div className="result-item">
          <span className="label">근속기간</span>
          <span className="value">
            {servicePeriod.years}년 {servicePeriod.months}개월
          </span>
        </div>

        <div className="result-item">
          <span className="label">발생 연차</span>
          <span className="value">{accruedPretty}</span>
          <span className="sub-value">
            ({accruedHoursTotal}시간 / {accruedDaysTotal}일)
          </span>
        </div>

        <div className="result-item">
          <span className="label">사용 연차</span>
          <span className="value">{usedPretty}</span>
          <span className="sub-value">
            ({usedHoursTotal}시간 / {usedDaysTotal.toFixed(1)}일)
          </span>
        </div>

        <div className="result-item highlight">
          <span className="label">잔여 연차</span>
          <span className={`value ${remainingHours < 0 ? 'negative' : ''}`}>
            {remainingPretty}
          </span>
          <span className={`sub-value ${remainingHours < 0 ? 'negative' : ''}`}>
            ({remainingHours}시간 / {remainingDays.toFixed(1)}일)
          </span>
        </div>
      </div>
    </div>
  );
}
