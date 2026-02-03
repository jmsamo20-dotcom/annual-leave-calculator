import { describe, it, expect } from 'vitest';
import {
  parseDate,
  formatDate,
  isValidDateString,
  calculateServicePeriod,
  isBefore,
  isAfter,
  normalizeDateInput,
} from '../lib/calc/dateUtils';
import { getAccruedDays, getYearlyDays } from '../lib/calc/policyEngine';
import {
  calculate,
  validateInput,
  calculateUsedHours,
  calculateYearRemain,
  validateYearRemainInput,
  isDateInYear,
  calculateYearUsedHours,
} from '../lib/calc';
import {
  formatHoursAsDaysHours,
  daysToHours,
  hoursToDays,
  isValidDaysInput,
  presetToHours,
  getPresetMemo,
} from '../lib/calc/formatters';
import type { CalculationInput, UsageRecord, AnnualLeaveRecord, PolicyConfig, YearRemainInput } from '../lib/calc';

describe('dateUtils', () => {
  describe('parseDate', () => {
    it('YYYY-MM-DD 문자열을 UTC Date로 올바르게 파싱한다', () => {
      const date = parseDate('2024-03-15');
      expect(date.getUTCFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(2); // 0-indexed
      expect(date.getUTCDate()).toBe(15);
    });
  });

  describe('formatDate', () => {
    it('Date 객체를 YYYY-MM-DD 문자열로 변환한다', () => {
      const date = new Date(Date.UTC(2024, 5, 20));
      expect(formatDate(date)).toBe('2024-06-20');
    });
  });

  describe('isValidDateString', () => {
    it('유효한 날짜 문자열을 인식한다', () => {
      expect(isValidDateString('2024-01-15')).toBe(true);
      expect(isValidDateString('2023-12-31')).toBe(true);
    });

    it('잘못된 날짜 형식을 거부한다', () => {
      expect(isValidDateString('2024/01/15')).toBe(false);
      expect(isValidDateString('01-15-2024')).toBe(false);
      expect(isValidDateString('2024-1-15')).toBe(false);
      expect(isValidDateString('not-a-date')).toBe(false);
    });

    it('존재하지 않는 날짜를 거부한다', () => {
      expect(isValidDateString('2024-02-30')).toBe(false);
      expect(isValidDateString('2024-13-01')).toBe(false);
    });
  });

  describe('calculateServicePeriod', () => {
    it('정확한 근속기간을 계산한다 - 1년 미만', () => {
      const result = calculateServicePeriod('2024-01-15', '2024-06-15');
      expect(result.years).toBe(0);
      expect(result.months).toBe(5);
      expect(result.totalMonths).toBe(5);
    });

    it('정확한 근속기간을 계산한다 - 1년 이상', () => {
      const result = calculateServicePeriod('2022-03-01', '2024-06-15');
      expect(result.years).toBe(2);
      expect(result.months).toBe(3);
      expect(result.totalMonths).toBe(27);
    });

    it('일자 보정이 올바르게 동작한다', () => {
      const result = calculateServicePeriod('2024-03-31', '2024-04-15');
      expect(result.years).toBe(0);
      expect(result.months).toBe(0);
    });
  });

  describe('isBefore / isAfter', () => {
    it('날짜 비교가 올바르게 동작한다', () => {
      expect(isBefore('2024-01-01', '2024-01-02')).toBe(true);
      expect(isBefore('2024-01-02', '2024-01-01')).toBe(false);
      expect(isAfter('2024-01-02', '2024-01-01')).toBe(true);
      expect(isAfter('2024-01-01', '2024-01-02')).toBe(false);
    });
  });

  describe('normalizeDateInput', () => {
    it('YYYY-MM-DD 형식을 그대로 반환한다', () => {
      expect(normalizeDateInput('2024-06-12')).toBe('2024-06-12');
    });

    it('공백 구분자를 처리한다', () => {
      expect(normalizeDateInput('2024 6 12')).toBe('2024-06-12');
      expect(normalizeDateInput('2024  6  12')).toBe('2024-06-12');
    });

    it('슬래시 구분자를 처리한다', () => {
      expect(normalizeDateInput('2024/6/12')).toBe('2024-06-12');
      expect(normalizeDateInput('2024/06/12')).toBe('2024-06-12');
    });

    it('점 구분자를 처리한다', () => {
      expect(normalizeDateInput('2024.6.2')).toBe('2024-06-02');
      expect(normalizeDateInput('2024.12.31')).toBe('2024-12-31');
    });

    it('앞뒤 공백을 제거한다', () => {
      expect(normalizeDateInput('  2024-06-12  ')).toBe('2024-06-12');
    });

    it('잘못된 월을 거부한다', () => {
      expect(normalizeDateInput('2024-13-01')).toBe(null);
      expect(normalizeDateInput('2024-0-01')).toBe(null);
    });

    it('잘못된 일을 거부한다', () => {
      expect(normalizeDateInput('2024-06-32')).toBe(null);
      expect(normalizeDateInput('2024-06-0')).toBe(null);
    });

    it('존재하지 않는 날짜를 거부한다', () => {
      expect(normalizeDateInput('2024-02-30')).toBe(null);
    });

    it('잘못된 형식을 거부한다', () => {
      expect(normalizeDateInput('abcd')).toBe(null);
      expect(normalizeDateInput('')).toBe(null);
      expect(normalizeDateInput('2024')).toBe(null);
      expect(normalizeDateInput('2024-06')).toBe(null);
    });
  });
});

describe('formatters', () => {
  describe('formatHoursAsDaysHours', () => {
    it('시간을 일+시간 형식으로 변환한다 (8시간 기준)', () => {
      expect(formatHoursAsDaysHours(9, 8)).toBe('1일 1시간');
      expect(formatHoursAsDaysHours(16, 8)).toBe('2일');
      expect(formatHoursAsDaysHours(4, 8)).toBe('4시간');
      expect(formatHoursAsDaysHours(0, 8)).toBe('0일 0시간');
    });

    it('음수 시간을 올바르게 처리한다', () => {
      expect(formatHoursAsDaysHours(-9, 8)).toBe('-1일 1시간');
      expect(formatHoursAsDaysHours(-4, 8)).toBe('-4시간');
    });

    it('다른 workHoursPerDay에서도 동작한다', () => {
      expect(formatHoursAsDaysHours(10, 5)).toBe('2일');
      expect(formatHoursAsDaysHours(7, 5)).toBe('1일 2시간');
    });
  });

  describe('daysToHours / hoursToDays', () => {
    it('일수를 시간으로 변환한다', () => {
      expect(daysToHours(1, 8)).toBe(8);
      expect(daysToHours(0.5, 8)).toBe(4);
      expect(daysToHours(2.5, 8)).toBe(20);
    });

    it('시간을 일수로 변환한다', () => {
      expect(hoursToDays(8, 8)).toBe(1);
      expect(hoursToDays(4, 8)).toBe(0.5);
      expect(hoursToDays(20, 8)).toBe(2.5);
    });
  });

  describe('isValidDaysInput', () => {
    it('정수 시간으로 변환 가능한 일수를 검증한다', () => {
      expect(isValidDaysInput(1, 8)).toBe(true);
      expect(isValidDaysInput(0.5, 8)).toBe(true);
      expect(isValidDaysInput(0.25, 8)).toBe(true);
    });

    it('정수 시간으로 변환 불가능한 일수를 거부한다', () => {
      expect(isValidDaysInput(0.3, 8)).toBe(false);
      expect(isValidDaysInput(1.1, 8)).toBe(false);
    });
  });

  describe('presetToHours', () => {
    it('1H 프리셋은 1시간을 반환한다', () => {
      expect(presetToHours('1H', 8)).toBe(1);
    });

    it('2H 프리셋은 2시간을 반환한다', () => {
      expect(presetToHours('2H', 8)).toBe(2);
    });

    it('AM_HALF/PM_HALF 프리셋은 workHoursPerDay의 절반을 반환한다', () => {
      expect(presetToHours('AM_HALF', 8)).toBe(4);
      expect(presetToHours('PM_HALF', 8)).toBe(4);
      expect(presetToHours('AM_HALF', 10)).toBe(5);
    });

    it('FULL_DAY 프리셋은 workHoursPerDay를 반환한다', () => {
      expect(presetToHours('FULL_DAY', 8)).toBe(8);
      expect(presetToHours('FULL_DAY', 10)).toBe(10);
    });

    it('CUSTOM 프리셋은 0을 반환한다', () => {
      expect(presetToHours('CUSTOM', 8)).toBe(0);
    });
  });

  describe('getPresetMemo', () => {
    it('각 프리셋에 맞는 메모를 반환한다', () => {
      expect(getPresetMemo('1H')).toBe('1시간');
      expect(getPresetMemo('2H')).toBe('2시간');
      expect(getPresetMemo('AM_HALF')).toBe('오전반차');
      expect(getPresetMemo('PM_HALF')).toBe('오후반차');
      expect(getPresetMemo('FULL_DAY')).toBe('연차');
      expect(getPresetMemo('CUSTOM')).toBe('');
    });
  });
});

describe('isDateInYear', () => {
  it('해당 연도의 날짜이면 true를 반환한다', () => {
    expect(isDateInYear('2024-01-01', 2024)).toBe(true);
    expect(isDateInYear('2024-12-31', 2024)).toBe(true);
    expect(isDateInYear('2024-06-15', 2024)).toBe(true);
  });

  it('다른 연도의 날짜이면 false를 반환한다', () => {
    expect(isDateInYear('2023-12-31', 2024)).toBe(false);
    expect(isDateInYear('2025-01-01', 2024)).toBe(false);
  });

  it('유효하지 않은 날짜이면 false를 반환한다', () => {
    expect(isDateInYear('invalid', 2024)).toBe(false);
    expect(isDateInYear('', 2024)).toBe(false);
  });
});

describe('calculateYearUsedHours', () => {
  it('annualLeaveRecords의 amountHours 합계를 반환한다', () => {
    const records: AnnualLeaveRecord[] = [
      { id: '1', type: 'ANNUAL', date: '2024-01-15', amountHours: 8, memo: '연차' },
      { id: '2', type: 'ANNUAL', date: '2024-02-10', amountHours: 4, memo: '반차' },
      { id: '3', type: 'ANNUAL', date: '2024-03-05', amountHours: 1, memo: '1시간' },
    ];
    expect(calculateYearUsedHours(records)).toBe(13);
  });

  it('빈 배열은 0을 반환한다', () => {
    expect(calculateYearUsedHours([])).toBe(0);
  });
});

describe('policyEngine', () => {
  const defaultPolicy: PolicyConfig = { type: 'DEFAULT' };

  describe('getAccruedDays with DEFAULT policy', () => {
    it('1년 미만 근속 시 월 1일씩 발생한다', () => {
      const days = getAccruedDays('2024-01-01', '2024-07-01', defaultPolicy);
      expect(days).toBe(6);
    });

    it('11개월 근속 시 11일이 발생한다', () => {
      const days = getAccruedDays('2024-01-01', '2024-12-01', defaultPolicy);
      expect(days).toBe(11);
    });

    it('1년 이상 근속 시 15일이 추가된다', () => {
      const days = getAccruedDays('2023-01-01', '2024-02-01', defaultPolicy);
      expect(days).toBe(26); // 11 + 15
    });

    it('기준일이 입사일보다 이전이면 0을 반환한다', () => {
      const days = getAccruedDays('2024-06-01', '2024-01-01', defaultPolicy);
      expect(days).toBe(0);
    });

    it('3년 근속 시 누적 연차를 정확히 계산한다', () => {
      // 11 + 15(y=1) + 15(y=2) + 16(y=3) = 57
      const days = getAccruedDays('2021-01-01', '2024-01-01', defaultPolicy);
      expect(days).toBe(57);
    });

    it('7년 근속 시 누적 연차를 정확히 계산한다', () => {
      // 11 + 15 + 15 + 16 + 16 + 17 + 17 + 18 = 125
      const days = getAccruedDays('2017-01-01', '2024-01-01', defaultPolicy);
      expect(days).toBe(125);
    });

    it('2년 근속 시 누적 연차를 정확히 계산한다', () => {
      // 11 + 15(y=1) + 15(y=2) = 41
      const days = getAccruedDays('2022-01-01', '2024-01-01', defaultPolicy);
      expect(days).toBe(41);
    });
  });
});

describe('validateInput', () => {
  const validInput: CalculationInput = {
    hireDate: '2023-01-01',
    asOfDate: '2024-01-01',
    workHoursPerDay: 8,
    usedHoursTotal: 40,
    policyConfig: { type: 'DEFAULT' },
  };

  it('유효한 입력에 대해 isValid=true를 반환한다', () => {
    const result = validateInput(validInput);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('기준일이 입사일보다 이전이면 에러를 반환한다', () => {
    const input: CalculationInput = {
      ...validInput,
      hireDate: '2024-06-01',
      asOfDate: '2024-01-01',
    };
    const result = validateInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('기준일은 입사일 이후여야 합니다.');
  });

  it('잘못된 날짜 형식에 대해 에러를 반환한다', () => {
    const input: CalculationInput = {
      ...validInput,
      hireDate: 'invalid-date',
    };
    const result = validateInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('입사일'))).toBe(true);
  });

  it('workHoursPerDay가 범위를 벗어나면 에러를 반환한다', () => {
    const input: CalculationInput = {
      ...validInput,
      workHoursPerDay: 25,
    };
    const result = validateInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('근로시간'))).toBe(true);
  });

  it('usedHoursTotal이 소수이면 에러를 반환한다', () => {
    const input: CalculationInput = {
      ...validInput,
      usedHoursTotal: 8.5,
    };
    const result = validateInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('정수'))).toBe(true);
  });

  it('usedHoursTotal이 음수이면 에러를 반환한다', () => {
    const input: CalculationInput = {
      ...validInput,
      usedHoursTotal: -5,
    };
    const result = validateInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('0 이상'))).toBe(true);
  });

  it('usageRecords의 amountHours가 소수이면 에러를 반환한다', () => {
    const records: UsageRecord[] = [
      { id: '1', date: '2024-01-05', amountHours: 4.5, memo: '' },
    ];
    const input: CalculationInput = {
      ...validInput,
      usedHoursTotal: undefined,
      usageRecords: records,
    };
    const result = validateInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('정수'))).toBe(true);
  });

  it('기준일 이후 사용내역은 warning을 반환한다', () => {
    const records: UsageRecord[] = [
      { id: '1', date: '2024-01-05', amountHours: 8, memo: '' },
      { id: '2', date: '2024-02-01', amountHours: 8, memo: '기준일 이후' },
    ];
    const input: CalculationInput = {
      ...validInput,
      asOfDate: '2024-01-15',
      usedHoursTotal: undefined,
      usageRecords: records,
    };
    const result = validateInput(input);
    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes('제외'))).toBe(true);
  });
});

describe('calculateUsedHours', () => {
  it('usageRecords가 없으면 usedHoursTotal을 사용한다', () => {
    expect(calculateUsedHours(80, undefined, '2024-01-01')).toBe(80);
    expect(calculateUsedHours(80, [], '2024-01-01')).toBe(80);
  });

  it('usageRecords가 있으면 합계를 계산한다', () => {
    const records: UsageRecord[] = [
      { id: '1', date: '2024-01-05', amountHours: 16, memo: '' },
      { id: '2', date: '2024-03-10', amountHours: 24, memo: '' },
    ];
    expect(calculateUsedHours(100, records, '2024-12-31')).toBe(40);
  });

  it('기준일 이후 사용내역은 합산에서 제외한다', () => {
    const records: UsageRecord[] = [
      { id: '1', date: '2024-01-05', amountHours: 16, memo: '' },
      { id: '2', date: '2024-03-10', amountHours: 24, memo: '기준일 이후' },
    ];
    expect(calculateUsedHours(100, records, '2024-02-01')).toBe(16);
  });

  it('둘 다 없으면 0을 반환한다', () => {
    expect(calculateUsedHours(undefined, undefined, '2024-01-01')).toBe(0);
  });
});

describe('calculate', () => {
  const defaultInput: CalculationInput = {
    hireDate: '2023-01-01',
    asOfDate: '2024-01-01',
    workHoursPerDay: 8,
    usedHoursTotal: 40,
    policyConfig: { type: 'DEFAULT' },
  };

  it('remainingHours = accruedHoursTotal - usedHoursTotal 을 계산한다', () => {
    const result = calculate(defaultInput);
    // 1년 근속: 26일 = 208시간
    expect(result.accruedHoursTotal).toBe(208);
    expect(result.usedHoursTotal).toBe(40);
    expect(result.remainingHours).toBe(168);
  });

  it('표시용 days를 올바르게 계산한다', () => {
    const result = calculate(defaultInput);
    expect(result.accruedDaysTotal).toBe(26);
    expect(result.usedDaysTotal).toBe(5); // 40 / 8
    expect(result.remainingDays).toBe(21); // 168 / 8
  });

  it('pretty 문자열을 올바르게 생성한다', () => {
    const result = calculate(defaultInput);
    expect(result.accruedPretty).toBe('26일');
    expect(result.usedPretty).toBe('5일');
    expect(result.remainingPretty).toBe('21일');
  });

  it('usageRecords 리스트로 사용 시간을 계산한다', () => {
    const records: UsageRecord[] = [
      { id: '1', date: '2024-01-05', amountHours: 16, memo: '' },
      { id: '2', date: '2024-03-10', amountHours: 12, memo: '' },
    ];
    const input: CalculationInput = {
      ...defaultInput,
      asOfDate: '2024-12-31',
      usedHoursTotal: undefined,
      usageRecords: records,
    };
    const result = calculate(input);
    expect(result.usedHoursTotal).toBe(28);
    expect(result.remainingHours).toBe(180); // 208 - 28
  });

  it('workHoursPerDay가 다르면 결과도 달라진다', () => {
    const input: CalculationInput = {
      ...defaultInput,
      workHoursPerDay: 4,
    };
    const result = calculate(input);
    expect(result.accruedHoursTotal).toBe(104); // 26 * 4
    expect(result.remainingHours).toBe(64); // 104 - 40
    expect(result.remainingDays).toBe(16); // 64 / 4
  });

  it('근속기간을 올바르게 계산한다', () => {
    const result = calculate(defaultInput);
    expect(result.servicePeriod.years).toBe(1);
    expect(result.servicePeriod.months).toBe(0);
  });
});

describe('getYearlyDays', () => {
  it('년차별 연차 일수를 올바르게 계산한다', () => {
    expect(getYearlyDays(1)).toBe(15);
    expect(getYearlyDays(2)).toBe(15);
    expect(getYearlyDays(3)).toBe(16);
    expect(getYearlyDays(4)).toBe(16);
    expect(getYearlyDays(5)).toBe(17);
    expect(getYearlyDays(10)).toBe(19);
  });

  it('최대 25일로 제한된다', () => {
    expect(getYearlyDays(21)).toBe(25);
    expect(getYearlyDays(30)).toBe(25);
  });

  it('0 이하는 0을 반환한다', () => {
    expect(getYearlyDays(0)).toBe(0);
    expect(getYearlyDays(-1)).toBe(0);
  });
});

describe('validateYearRemainInput', () => {
  const validInput: YearRemainInput = {
    year: 2024,
    hireDate: '2022-01-01',
    carryDays: 5,
    workHoursPerDay: 8,
    annualLeaveRecords: [
      { id: '1', type: 'ANNUAL', date: '2024-01-15', amountHours: 8, memo: '연차' },
      { id: '2', type: 'ANNUAL', date: '2024-02-10', amountHours: 4, memo: '반차' },
    ],
    policyConfig: { type: 'DEFAULT' },
  };

  it('유효한 입력에 대해 isValid=true를 반환한다', () => {
    const result = validateYearRemainInput(validInput);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('carryDays가 음수이면 에러를 반환한다', () => {
    const input: YearRemainInput = {
      ...validInput,
      carryDays: -5,
    };
    const result = validateYearRemainInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('이월'))).toBe(true);
  });

  it('annualLeaveRecords의 amountHours가 소수이면 에러를 반환한다', () => {
    const input: YearRemainInput = {
      ...validInput,
      annualLeaveRecords: [{ id: '1', type: 'ANNUAL', date: '2024-01-15', amountHours: 8.5, memo: '' }],
    };
    const result = validateYearRemainInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('정수'))).toBe(true);
  });

  it('annualLeaveRecords의 날짜가 연도 범위 밖이면 에러를 반환한다', () => {
    const input: YearRemainInput = {
      ...validInput,
      annualLeaveRecords: [{ id: '1', type: 'ANNUAL', date: '2023-12-31', amountHours: 8, memo: '' }],
    };
    const result = validateYearRemainInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('범위 밖'))).toBe(true);
  });

  it('입사일이 기준연도보다 이후이면 에러를 반환한다', () => {
    const input: YearRemainInput = {
      ...validInput,
      year: 2020,
      hireDate: '2022-01-01',
    };
    const result = validateYearRemainInput(input);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('이후'))).toBe(true);
  });
});

describe('calculateYearRemain', () => {
  // 40시간 = 5일 사용 (8시간 * 5)
  const defaultInput: YearRemainInput = {
    year: 2024,
    hireDate: '2022-01-01',
    carryDays: 5,
    workHoursPerDay: 8,
    annualLeaveRecords: [
      { id: '1', type: 'ANNUAL', date: '2024-01-15', amountHours: 8, memo: '연차' },
      { id: '2', type: 'ANNUAL', date: '2024-02-10', amountHours: 8, memo: '연차' },
      { id: '3', type: 'ANNUAL', date: '2024-03-05', amountHours: 8, memo: '연차' },
      { id: '4', type: 'ANNUAL', date: '2024-04-20', amountHours: 8, memo: '연차' },
      { id: '5', type: 'ANNUAL', date: '2024-05-15', amountHours: 8, memo: '연차' },
    ], // 총 40시간 (5일)
    policyConfig: { type: 'DEFAULT' },
  };

  it('올해 발생 연차를 올바르게 계산한다', () => {
    // 2022-01-01 입사, 2024년 기준 = 2년차
    // getYearlyDays(2) = 15
    const result = calculateYearRemain(defaultInput);
    expect(result.yearlyGrantDays).toBe(15);
    expect(result.yearlyGrantHours).toBe(120);
  });

  it('이월 연차를 올바르게 계산한다', () => {
    const result = calculateYearRemain(defaultInput);
    expect(result.carryDays).toBe(5);
    expect(result.carryHours).toBe(40);
  });

  it('보유 연차 = 발생 + 이월', () => {
    const result = calculateYearRemain(defaultInput);
    expect(result.availableHours).toBe(160); // 120 + 40
    expect(result.availableDays).toBe(20);
  });

  it('잔여 연차 = 보유 - 사용', () => {
    const result = calculateYearRemain(defaultInput);
    expect(result.remainingHours).toBe(120); // 160 - 40
    expect(result.remainingDays).toBe(15);
  });

  it('pretty 문자열을 올바르게 생성한다', () => {
    const result = calculateYearRemain(defaultInput);
    expect(result.yearlyGrantPretty).toBe('15일');
    expect(result.carryPretty).toBe('5일');
    expect(result.availablePretty).toBe('20일');
    expect(result.usedPretty).toBe('5일');
    expect(result.remainingPretty).toBe('15일');
  });

  it('사용이 보유를 초과하면 잔여가 음수이다', () => {
    // 160시간 = 20일 사용
    const records: AnnualLeaveRecord[] = [];
    for (let i = 0; i < 20; i++) {
      records.push({
        id: `${i}`,
        type: 'ANNUAL',
        date: `2024-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        amountHours: 8,
        memo: '연차',
      });
    }
    const input: YearRemainInput = {
      ...defaultInput,
      carryDays: 0,
      annualLeaveRecords: records, // 총 160시간 (20일) - 발생은 15일뿐
    };
    const result = calculateYearRemain(input);
    expect(result.remainingHours).toBe(-40);
    expect(result.remainingDays).toBe(-5);
  });

  it('근속년수를 올바르게 계산한다', () => {
    const result = calculateYearRemain(defaultInput);
    expect(result.tenureYears).toBe(2);
  });

  it('3년차 근속자의 연차를 올바르게 계산한다', () => {
    const input: YearRemainInput = {
      ...defaultInput,
      hireDate: '2021-01-01', // 2024년 기준 3년차
    };
    const result = calculateYearRemain(input);
    expect(result.tenureYears).toBe(3);
    expect(result.yearlyGrantDays).toBe(16); // getYearlyDays(3)
  });

  it('annualLeaveRecords의 합계로 사용시간을 계산한다', () => {
    const input: YearRemainInput = {
      ...defaultInput,
      annualLeaveRecords: [
        { id: '1', type: 'ANNUAL', date: '2024-01-15', amountHours: 4, memo: '반차' },
        { id: '2', type: 'ANNUAL', date: '2024-02-10', amountHours: 8, memo: '연차' },
        { id: '3', type: 'ANNUAL', date: '2024-03-05', amountHours: 1, memo: '1시간' },
      ], // 총 13시간
    };
    const result = calculateYearRemain(input);
    expect(result.usedHours).toBe(13);
  });
});

// =============================================
// workingDays 유틸리티 테스트
// =============================================
import {
  calculateWorkingDays,
  calculateWorkingDaysDetailed,
  getDateRange,
  getEndDate,
  isWeekend,
  parseLocalDate,
  formatDateToYYYYMMDD,
} from '../lib/calc/workingDays';

describe('workingDays utilities', () => {
  describe('parseLocalDate', () => {
    it('YYYY-MM-DD 문자열을 Date 객체로 변환한다', () => {
      const date = parseLocalDate('2024-01-15');
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // 0-indexed
      expect(date.getDate()).toBe(15);
    });
  });

  describe('formatDateToYYYYMMDD', () => {
    it('Date 객체를 YYYY-MM-DD 문자열로 변환한다', () => {
      const date = new Date(2024, 5, 12); // 2024-06-12
      expect(formatDateToYYYYMMDD(date)).toBe('2024-06-12');
    });

    it('한 자리 월/일을 0으로 패딩한다', () => {
      const date = new Date(2024, 0, 5); // 2024-01-05
      expect(formatDateToYYYYMMDD(date)).toBe('2024-01-05');
    });
  });

  describe('isWeekend', () => {
    it('토요일을 주말로 판별한다', () => {
      const saturday = parseLocalDate('2024-01-13'); // 토요일
      expect(isWeekend(saturday)).toBe(true);
    });

    it('일요일을 주말로 판별한다', () => {
      const sunday = parseLocalDate('2024-01-14'); // 일요일
      expect(isWeekend(sunday)).toBe(true);
    });

    it('평일을 주말로 판별하지 않는다', () => {
      const monday = parseLocalDate('2024-01-15'); // 월요일
      expect(isWeekend(monday)).toBe(false);
    });
  });

  describe('getDateRange', () => {
    it('시작일부터 지정된 일수만큼 날짜 범위를 생성한다', () => {
      const range = getDateRange('2024-01-15', 3);
      expect(range).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
    });

    it('1일이면 시작일만 반환한다', () => {
      const range = getDateRange('2024-01-15', 1);
      expect(range).toEqual(['2024-01-15']);
    });
  });

  describe('getEndDate', () => {
    it('시작일과 일수로 종료일을 계산한다', () => {
      expect(getEndDate('2024-01-15', 7)).toBe('2024-01-21');
    });

    it('1일이면 시작일과 동일하다', () => {
      expect(getEndDate('2024-01-15', 1)).toBe('2024-01-15');
    });
  });

  describe('calculateWorkingDays', () => {
    const noHolidays = new Set<string>();

    it('평일만 있는 기간은 전체가 근무일이다', () => {
      // 2024-01-15 (월) ~ 2024-01-19 (금) = 5일 모두 평일
      const workingDays = calculateWorkingDays('2024-01-15', 5, noHolidays);
      expect(workingDays).toBe(5);
    });

    it('주말이 포함된 기간에서 주말을 제외한다', () => {
      // 2024-01-12 (금) ~ 2024-01-18 (목) = 7일 중 토/일 제외 = 5일
      const workingDays = calculateWorkingDays('2024-01-12', 7, noHolidays);
      expect(workingDays).toBe(5);
    });

    it('공휴일을 제외한다', () => {
      const holidays = new Set(['2024-01-15', '2024-01-16']);
      // 2024-01-15 (월) ~ 2024-01-19 (금) = 5일 중 공휴일 2일 제외 = 3일
      const workingDays = calculateWorkingDays('2024-01-15', 5, holidays);
      expect(workingDays).toBe(3);
    });

    it('주말에 겹친 공휴일은 중복 차감하지 않는다', () => {
      const holidays = new Set(['2024-01-13']); // 토요일
      // 2024-01-12 (금) ~ 2024-01-14 (일) = 3일 중 토/일 제외 = 1일 (금)
      const workingDays = calculateWorkingDays('2024-01-12', 3, holidays);
      expect(workingDays).toBe(1);
    });

    it('토요일 시작 1일은 근무일 0일이다', () => {
      // 2024-01-13 (토) 1일 = 주말이므로 근무일 0
      const workingDays = calculateWorkingDays('2024-01-13', 1, noHolidays);
      expect(workingDays).toBe(0);
    });

    it('결혼휴가 7일 예시 (금요일 시작)', () => {
      // 2024-01-12 (금) 시작, 7일 = 금토일월화수목
      // 근무일: 금, 월, 화, 수, 목 = 5일
      const workingDays = calculateWorkingDays('2024-01-12', 7, noHolidays);
      expect(workingDays).toBe(5);
    });
  });

  describe('calculateWorkingDaysDetailed', () => {
    const noHolidays = new Set<string>();

    it('상세 결과를 반환한다', () => {
      const result = calculateWorkingDaysDetailed('2024-01-12', 7, noHolidays);
      expect(result.calendarDays).toBe(7);
      expect(result.workingDays).toBe(5);
      expect(result.weekendDays).toBe(2);
      expect(result.holidayDays).toBe(0);
      expect(result.dateRange).toHaveLength(7);
    });

    it('공휴일이 있는 경우 holidayDays를 계산한다', () => {
      const holidays = new Set(['2024-01-15']);
      const result = calculateWorkingDaysDetailed('2024-01-15', 5, holidays);
      expect(result.workingDays).toBe(4);
      expect(result.holidayDays).toBe(1);
    });
  });
});

// =============================================
// holidays 유틸리티 테스트
// =============================================
import {
  normalizeDateStr,
  mergeUniqueSorted,
  getKoreanPublicHolidaysPreset,
  isSupportedYear,
  getHolidayName,
} from '../lib/holidays';

describe('holidays utilities', () => {
  describe('normalizeDateStr', () => {
    it('유효한 YYYY-MM-DD 문자열을 그대로 반환한다', () => {
      expect(normalizeDateStr('2026-01-15')).toBe('2026-01-15');
    });

    it('잘못된 형식은 null을 반환한다', () => {
      expect(normalizeDateStr('2026/01/15')).toBeNull();
      expect(normalizeDateStr('01-15-2026')).toBeNull();
      expect(normalizeDateStr('invalid')).toBeNull();
    });

    it('범위를 벗어난 연도는 null을 반환한다', () => {
      expect(normalizeDateStr('1800-01-01')).toBeNull();
      expect(normalizeDateStr('2200-01-01')).toBeNull();
    });

    it('범위를 벗어난 월/일은 null을 반환한다', () => {
      expect(normalizeDateStr('2026-13-01')).toBeNull();
      expect(normalizeDateStr('2026-01-32')).toBeNull();
    });
  });

  describe('mergeUniqueSorted', () => {
    it('두 배열을 중복 제거하고 정렬하여 병합한다', () => {
      const base = ['2026-01-03', '2026-01-01'];
      const add = ['2026-01-02', '2026-01-01'];
      expect(mergeUniqueSorted(base, add)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    });

    it('빈 배열을 병합해도 정상 동작한다', () => {
      expect(mergeUniqueSorted([], ['2026-01-01'])).toEqual(['2026-01-01']);
      expect(mergeUniqueSorted(['2026-01-01'], [])).toEqual(['2026-01-01']);
      expect(mergeUniqueSorted([], [])).toEqual([]);
    });
  });

  describe('isSupportedYear', () => {
    it('2026년은 지원한다', () => {
      expect(isSupportedYear(2026)).toBe(true);
    });

    it('다른 연도는 지원하지 않는다', () => {
      expect(isSupportedYear(2025)).toBe(false);
      expect(isSupportedYear(2027)).toBe(false);
    });
  });

  describe('getKoreanPublicHolidaysPreset', () => {
    it('2026년 공휴일 프리셋을 반환한다', () => {
      const holidays = getKoreanPublicHolidaysPreset(2026, false);
      expect(holidays).not.toBeNull();
      expect(holidays).toContain('2026-01-01'); // 신정
      expect(holidays).toContain('2026-02-17'); // 설날
      expect(holidays).toContain('2026-12-25'); // 크리스마스
    });

    it('근로자의 날 포함 옵션이 동작한다', () => {
      const withoutLabor = getKoreanPublicHolidaysPreset(2026, false);
      const withLabor = getKoreanPublicHolidaysPreset(2026, true);

      expect(withoutLabor).not.toContain('2026-05-01');
      expect(withLabor).toContain('2026-05-01');
    });

    it('지원하지 않는 연도는 null을 반환한다', () => {
      expect(getKoreanPublicHolidaysPreset(2025, false)).toBeNull();
    });

    it('정렬된 배열을 반환한다', () => {
      const holidays = getKoreanPublicHolidaysPreset(2026, false)!;
      const sorted = [...holidays].sort();
      expect(holidays).toEqual(sorted);
    });
  });

  describe('getHolidayName', () => {
    it('2026년 공휴일 이름을 반환한다', () => {
      expect(getHolidayName('2026-01-01', 2026)).toBe('신정');
      expect(getHolidayName('2026-02-17', 2026)).toBe('설날');
      expect(getHolidayName('2026-12-25', 2026)).toBe('크리스마스');
    });

    it('근로자의 날 이름을 반환한다', () => {
      expect(getHolidayName('2026-05-01', 2026)).toBe('근로자의 날');
    });

    it('공휴일이 아닌 날짜는 null을 반환한다', () => {
      expect(getHolidayName('2026-01-02', 2026)).toBeNull();
    });
  });
});

// =============================================
// calendarUtils 테스트
// =============================================
import {
  formatDateToYYYYMMDD as calFormatDate,
  parseLocalDate as calParseDate,
  isDateInRange,
  getEventsForDate,
  isHoliday as calIsHoliday,
  isWeekend as calIsWeekend,
  getBadgeText,
  getKindLabel,
  hoursToDisplayDays,
} from '../lib/calendarUtils';
import type { LeaveEvent } from '../lib/calendarUtils';

describe('calendarUtils', () => {
  describe('parseLocalDate / formatDateToYYYYMMDD', () => {
    it('YYYY-MM-DD 문자열과 Date 간 변환이 일관적이다', () => {
      const dateStr = '2026-05-15';
      const date = calParseDate(dateStr);
      expect(calFormatDate(date)).toBe(dateStr);
    });
  });

  describe('isDateInRange', () => {
    it('날짜가 범위 내에 있으면 true', () => {
      const date = calParseDate('2026-01-15');
      expect(isDateInRange(date, '2026-01-10', '2026-01-20')).toBe(true);
    });

    it('날짜가 시작일과 같으면 true', () => {
      const date = calParseDate('2026-01-10');
      expect(isDateInRange(date, '2026-01-10', '2026-01-20')).toBe(true);
    });

    it('날짜가 종료일과 같으면 true', () => {
      const date = calParseDate('2026-01-20');
      expect(isDateInRange(date, '2026-01-10', '2026-01-20')).toBe(true);
    });

    it('날짜가 범위 밖이면 false', () => {
      const date = calParseDate('2026-01-05');
      expect(isDateInRange(date, '2026-01-10', '2026-01-20')).toBe(false);
    });
  });

  describe('getEventsForDate', () => {
    const events: LeaveEvent[] = [
      { id: '1', kind: 'annual', title: '연차', startDate: '2026-01-15', endDate: '2026-01-15' },
      { id: '2', kind: 'event', title: '결혼', startDate: '2026-01-10', endDate: '2026-01-16' },
    ];

    it('해당 날짜의 이벤트를 반환한다', () => {
      const date = calParseDate('2026-01-15');
      const result = getEventsForDate(date, events);
      expect(result).toHaveLength(2);
    });

    it('이벤트가 없는 날짜는 빈 배열 반환', () => {
      const date = calParseDate('2026-01-05');
      const result = getEventsForDate(date, events);
      expect(result).toHaveLength(0);
    });
  });

  describe('isHoliday / isWeekend', () => {
    it('공휴일 여부를 정확히 판별한다', () => {
      const holidays = new Set(['2026-01-01', '2026-12-25']);
      expect(calIsHoliday(calParseDate('2026-01-01'), holidays)).toBe(true);
      expect(calIsHoliday(calParseDate('2026-01-02'), holidays)).toBe(false);
    });

    it('주말 여부를 정확히 판별한다', () => {
      // 2026-01-10은 토요일, 2026-01-11은 일요일, 2026-01-12는 월요일
      expect(calIsWeekend(calParseDate('2026-01-10'))).toBe(true);
      expect(calIsWeekend(calParseDate('2026-01-11'))).toBe(true);
      expect(calIsWeekend(calParseDate('2026-01-12'))).toBe(false);
    });
  });

  describe('getBadgeText / getKindLabel', () => {
    it('각 종류에 맞는 뱃지 텍스트를 반환한다', () => {
      expect(getBadgeText('annual')).toBe('A');
      expect(getBadgeText('event')).toBe('경');
      expect(getBadgeText('half')).toBe('½');
      expect(getBadgeText('unpaid')).toBe('무');
    });

    it('각 종류에 맞는 라벨을 반환한다', () => {
      expect(getKindLabel('annual')).toBe('연차');
      expect(getKindLabel('event')).toBe('경조휴가');
      expect(getKindLabel('half')).toBe('반차');
      expect(getKindLabel('unpaid')).toBe('무급휴가');
    });
  });

  describe('hoursToDisplayDays', () => {
    it('시간을 일수로 변환한다', () => {
      expect(hoursToDisplayDays(8, 8)).toBe('1일');
      expect(hoursToDisplayDays(4, 8)).toBe('0.5일');
      expect(hoursToDisplayDays(12, 8)).toBe('1.5일');
      expect(hoursToDisplayDays(16, 8)).toBe('2일');
    });
  });
});
