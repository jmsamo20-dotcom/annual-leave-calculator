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

  // 잔여 연차 멘트 계산 (표시용, 1일 = 8시간)
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
