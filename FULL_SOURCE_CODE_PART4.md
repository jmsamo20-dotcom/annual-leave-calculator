# 연차계산기 전체 소스코드 (Part 4 - LeaveCalendar & App)

## 18. src/components/LeaveCalendar.tsx
```tsx
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
  initialMonth?: number;
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
  const startMonth = initialMonth ? initialMonth - 1 : 0;
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date(year, startMonth, 1));

  useEffect(() => {
    if (initialMonth !== undefined) {
      setActiveStartDate(new Date(year, initialMonth - 1, 1));
    }
  }, [year, initialMonth]);

  const leaveEvents = useMemo<LeaveEvent[]>(() => {
    const events: LeaveEvent[] = [];

    annualLeaveRecords.forEach((record) => {
      const isHalf = record.amountHours === workHoursPerDay / 2;
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
        endDate: record.date,
        memo: record.memo,
        deductHours: record.amountHours,
        deductDays: record.amountHours / workHoursPerDay,
      });
    });

    eventLeaveRecords.forEach((record) => {
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
        deductDays: record.workingDays,
      });
    });

    return events;
  }, [annualLeaveRecords, eventLeaveRecords, workHoursPerDay]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return getEventsForDate(selectedDate, leaveEvents);
  }, [selectedDate, leaveEvents]);

  const selectedDateHolidayInfo = useMemo(() => {
    if (!selectedDate) return { isHoliday: false, name: null };
    const isHol = isHoliday(selectedDate, holidays);
    if (!isHol) return { isHoliday: false, name: null };
    const dateStr = formatDateToYYYYMMDD(selectedDate);
    const name = getHolidayName(dateStr, year);
    return { isHoliday: true, name };
  }, [selectedDate, holidays, year]);

  const handleDateClick = useCallback((value: Value) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    }
  }, []);

  const handleActiveStartDateChange = useCallback(
    ({ activeStartDate }: { activeStartDate: Date | null }) => {
      if (activeStartDate) {
        setActiveStartDate(activeStartDate);
      }
    },
    []
  );

  const today = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    };
  }, []);

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

  const renderTileContent = useCallback(
    ({ date, view }: { date: Date; view: string }) => {
      if (view !== 'month') return null;

      const dateEvents = getEventsForDate(date, leaveEvents);
      const isHolidayDate = isHoliday(date, holidays);
      const isTodayDate = isToday(date);

      if (dateEvents.length === 0 && !isHolidayDate && !isTodayDate) return null;

      const dateStr = formatDateToYYYYMMDD(date);
      const holidayName = isHolidayDate ? getHolidayName(dateStr, year) : null;

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
```
