import { useState, useMemo, useCallback, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import type { AnnualLeaveRecord, EventLeaveRecord } from '../lib/calc/types';
import type { LeaveEvent, LeaveKind } from '../lib/calendarUtils';
import {
  formatDateToYYYYMMDD,
  getEventsForDate,
  isHoliday,
  getBadgeText,
  getKindLabel,
  hoursToDisplayDays,
} from '../lib/calendarUtils';
import { getHolidayName } from '../lib/holidays';

interface LeaveCalendarProps {
  year: number;
  annualLeaveRecords: AnnualLeaveRecord[];
  eventLeaveRecords: EventLeaveRecord[];
  holidays: Set<string>;
  workHoursPerDay?: number;
  initialMonth?: number; // 1-12, 기준일의 월
}

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export function LeaveCalendar({
  year,
  annualLeaveRecords,
  eventLeaveRecords,
  holidays,
  workHoursPerDay = 8,
  initialMonth,
}: LeaveCalendarProps) {
  // 초기 월: initialMonth가 주어지면 해당 월, 아니면 1월
  const startMonth = initialMonth ? initialMonth - 1 : 0; // 0-indexed
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date(year, startMonth, 1));

  // 기준일(initialMonth) 변경 시 캘린더 이동
  useEffect(() => {
    if (initialMonth !== undefined) {
      setActiveStartDate(new Date(year, initialMonth - 1, 1));
    }
  }, [year, initialMonth]);

  // 기존 데이터를 LeaveEvent 형식으로 변환
  const leaveEvents = useMemo<LeaveEvent[]>(() => {
    const events: LeaveEvent[] = [];

    // 연차 사용내역 변환
    annualLeaveRecords.forEach((record) => {
      const isHalf = record.amountHours === workHoursPerDay / 2;
      // 1~3시간 연차 (반차가 아닌 시간단위)
      const isHourLeave = record.amountHours >= 1 && record.amountHours <= 3 && !isHalf;

      let kind: LeaveKind;
      let title: string;

      if (isHourLeave) {
        kind = 'hour';
        title = record.memo || `${record.amountHours}시간`;
      } else if (isHalf) {
        kind = 'half';
        title = record.memo || '반차';
      } else {
        kind = 'annual';
        title = record.memo || '연차';
      }

      events.push({
        id: record.id,
        kind,
        title,
        startDate: record.date,
        endDate: record.date, // 연차는 단일 날짜
        memo: record.memo,
        deductHours: record.amountHours,
        deductDays: record.amountHours / workHoursPerDay,
      });
    });

    // 경조휴가 변환 (날짜 범위로 표시)
    eventLeaveRecords.forEach((record) => {
      // 종료일 계산 (시작일 + calendarDays - 1)
      const startDate = new Date(`${record.date}T00:00:00`);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + record.calendarDays - 1);
      const endDateStr = formatDateToYYYYMMDD(endDate);

      events.push({
        id: record.id,
        kind: 'event',
        title: record.title,
        startDate: record.date,
        endDate: endDateStr,
        memo: record.memo,
        deductDays: record.workingDays, // 실제 근무일 차감
      });
    });

    return events;
  }, [annualLeaveRecords, eventLeaveRecords, workHoursPerDay]);

  // 선택된 날짜의 이벤트 목록
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return getEventsForDate(selectedDate, leaveEvents);
  }, [selectedDate, leaveEvents]);

  // 선택된 날짜가 공휴일인지 및 공휴일 이름
  const selectedDateHolidayInfo = useMemo(() => {
    if (!selectedDate) return { isHoliday: false, name: null };
    const isHol = isHoliday(selectedDate, holidays);
    if (!isHol) return { isHoliday: false, name: null };
    const dateStr = formatDateToYYYYMMDD(selectedDate);
    const name = getHolidayName(dateStr, year);
    return { isHoliday: true, name };
  }, [selectedDate, holidays, year]);

  // 날짜 클릭 핸들러
  const handleDateClick = useCallback((value: Value) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    }
  }, []);

  // 월 변경 핸들러
  const handleActiveStartDateChange = useCallback(
    ({ activeStartDate }: { activeStartDate: Date | null }) => {
      if (activeStartDate) {
        setActiveStartDate(activeStartDate);
      }
    },
    []
  );

  // 오늘 날짜 (년/월/일 비교용)
  const today = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    };
  }, []);

  // 날짜가 오늘인지 확인
  const isToday = useCallback(
    (date: Date) => {
      return (
        date.getFullYear() === today.year &&
        date.getMonth() === today.month &&
        date.getDate() === today.day
      );
    },
    [today]
  );

  // 타일 컨텐츠 렌더링 (뱃지 표시)
  const renderTileContent = useCallback(
    ({ date, view }: { date: Date; view: string }) => {
      if (view !== 'month') return null;

      const dateEvents = getEventsForDate(date, leaveEvents);
      const isHolidayDate = isHoliday(date, holidays);
      const isTodayDate = isToday(date);

      if (dateEvents.length === 0 && !isHolidayDate && !isTodayDate) return null;

      // 공휴일 이름 가져오기
      const dateStr = formatDateToYYYYMMDD(date);
      const holidayName = isHolidayDate ? getHolidayName(dateStr, year) : null;

      // 종류별로 그룹화하여 중복 뱃지 방지
      // hour 타입은 시간을 합산하여 표시
      const kindSet = new Set<LeaveKind>();
      let totalHours = 0;
      dateEvents.forEach((e) => {
        if (e.kind === 'hour' && e.deductHours !== undefined) {
          totalHours += e.deductHours;
        } else {
          kindSet.add(e.kind);
        }
      });

      return (
        <div className="calendar-tile-badges">
          {isTodayDate && (
            <span className="badge badge-today">TODAY</span>
          )}
          {isHolidayDate && (
            <span className="badge badge-holiday-name">
              {holidayName || '공휴일'}
            </span>
          )}
          {Array.from(kindSet).map((kind) => (
            <span key={kind} className={`badge badge-${kind}`}>
              {getBadgeText(kind)}
            </span>
          ))}
          {totalHours > 0 && totalHours <= 3 && (
            <span className="badge badge-hour">{totalHours}h</span>
          )}
        </div>
      );
    },
    [leaveEvents, holidays, year, isToday]
  );

  // 타일 클래스 지정 (공휴일, 이벤트 있는 날 등)
  const getTileClassName = useCallback(
    ({ date, view }: { date: Date; view: string }) => {
      if (view !== 'month') return '';

      const classes: string[] = [];
      const dateEvents = getEventsForDate(date, leaveEvents);

      if (isHoliday(date, holidays)) {
        classes.push('holiday-tile');
      }

      if (dateEvents.length > 0) {
        classes.push('has-events');
      }

      return classes.join(' ');
    },
    [leaveEvents, holidays]
  );

  // 연도 범위 제한
  const minDate = new Date(year, 0, 1);
  const maxDate = new Date(year, 11, 31);

  return (
    <div className="leave-calendar-container">
      <div className="leave-calendar-header">
        <h3>휴가 사용 캘린더</h3>
        <p className="calendar-hint">날짜를 클릭하면 해당일 사용 내역을 확인할 수 있어요.</p>
      </div>

      <div className="leave-calendar-wrapper">
        <Calendar
          onChange={handleDateClick}
          value={selectedDate}
          activeStartDate={activeStartDate}
          onActiveStartDateChange={handleActiveStartDateChange}
          minDate={minDate}
          maxDate={maxDate}
          locale="ko-KR"
          calendarType="gregory"
          tileContent={renderTileContent}
          tileClassName={getTileClassName}
          formatDay={(_locale, date) => date.getDate().toString()}
          navigationLabel={({ date }) => `${date.getFullYear()}년 ${date.getMonth() + 1}월`}
          showNeighboringMonth={false}
          minDetail="month"
          maxDetail="month"
        />
      </div>

      {/* 범례 */}
      <div className="calendar-legend">
        <span className="legend-item">
          <span className="badge badge-annual">A</span> 연차
        </span>
        <span className="legend-item">
          <span className="badge badge-half">½</span> 반차
        </span>
        <span className="legend-item">
          <span className="badge badge-hour">1~3h</span> 시간연차
        </span>
        <span className="legend-item">
          <span className="badge badge-event">경</span> 경조휴가
        </span>
        <span className="legend-item">
          <span className="badge badge-holiday-name">공휴일</span>
        </span>
      </div>

      {/* 선택된 날짜 상세 패널 */}
      {selectedDate && (
        <div className="selected-date-panel">
          <div className="panel-header">
            <strong>{formatDateToYYYYMMDD(selectedDate)}</strong>
            {selectedDateHolidayInfo.isHoliday && (
              <span className="holiday-badge">
                {selectedDateHolidayInfo.name || '공휴일'}
              </span>
            )}
          </div>

          {selectedDateEvents.length > 0 ? (
            <ul className="event-list">
              {selectedDateEvents.map((event) => (
                <li key={event.id} className={`event-item event-${event.kind}`}>
                  <div className="event-header">
                    <span className={`event-kind-badge badge-${event.kind}`}>
                      {getKindLabel(event.kind)}
                    </span>
                    <span className="event-title">{event.title}</span>
                  </div>
                  <div className="event-details">
                    {event.kind === 'event' ? (
                      <>
                        <span className="event-period">
                          {event.startDate} ~ {event.endDate}
                        </span>
                        <span className="event-deduct">
                          실제 반영: +{event.deductDays}일 (근무일)
                        </span>
                      </>
                    ) : (
                      <>
                        {event.deductHours !== undefined && (
                          <span className="event-deduct">
                            차감: {hoursToDisplayDays(event.deductHours, workHoursPerDay)} (
                            {event.deductHours}시간)
                          </span>
                        )}
                      </>
                    )}
                    {event.memo && <span className="event-memo">메모: {event.memo}</span>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-events">
              {selectedDateHolidayInfo.isHoliday
                ? `${selectedDateHolidayInfo.name || '공휴일'}입니다. 등록된 휴가가 없습니다.`
                : '등록된 휴가가 없습니다.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
