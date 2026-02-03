import type { UsageRecord } from '../lib/calc';
import { getTodayString } from '../lib/calc/dateUtils';

interface UsageRecordListProps {
  records: UsageRecord[];
  workHoursPerDay: number;
  onAdd: (record: UsageRecord) => void;
  onRemove: (id: string) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function UsageRecordList({
  records,
  workHoursPerDay,
  onAdd,
  onRemove,
}: UsageRecordListProps) {
  const handleAdd = () => {
    onAdd({
      id: generateId(),
      date: getTodayString(),
      amountHours: workHoursPerDay,
      memo: '',
    });
  };

  const totalHours = records.reduce((sum, r) => sum + r.amountHours, 0);

  return (
    <div className="usage-record-list">
      <div className="list-header">
        <span>사용내역 리스트</span>
        <button type="button" onClick={handleAdd} className="btn-add">
          + 추가
        </button>
      </div>

      {records.length === 0 ? (
        <p className="empty-message">사용내역이 없습니다.</p>
      ) : (
        <>
          <table className="records-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>시간</th>
                <th>메모</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <UsageRecordRow
                  key={record.id}
                  record={record}
                  workHoursPerDay={workHoursPerDay}
                  onRemove={() => onRemove(record.id)}
                />
              ))}
            </tbody>
          </table>
          <div className="list-total">
            합계: {totalHours}시간 ({(totalHours / workHoursPerDay).toFixed(1)}일)
          </div>
        </>
      )}
    </div>
  );
}

interface UsageRecordRowProps {
  record: UsageRecord;
  workHoursPerDay: number;
  onRemove: () => void;
}

function UsageRecordRow({ record, workHoursPerDay, onRemove }: UsageRecordRowProps) {
  return (
    <tr>
      <td>{record.date}</td>
      <td>
        {record.amountHours}시간
        <span className="days-equiv">
          ({(record.amountHours / workHoursPerDay).toFixed(1)}일)
        </span>
      </td>
      <td>{record.memo || '-'}</td>
      <td>
        <button type="button" onClick={onRemove} className="btn-remove">
          삭제
        </button>
      </td>
    </tr>
  );
}
