interface PresetButtonsProps {
  workHoursPerDay: number;
  onAddHours: (delta: number) => void;
  showSubtract?: boolean;
}

export function PresetButtons({
  workHoursPerDay,
  onAddHours,
  showSubtract = false,
}: PresetButtonsProps) {
  const presets = [
    { label: '+1시간', hours: 1 },
    { label: '+2시간', hours: 2 },
    { label: '+반차', hours: Math.floor(workHoursPerDay / 2) },
    { label: '+1일', hours: workHoursPerDay },
  ];

  const subtractPresets = [
    { label: '-1시간', hours: -1 },
    { label: '-반차', hours: -Math.floor(workHoursPerDay / 2) },
    { label: '-1일', hours: -workHoursPerDay },
  ];

  return (
    <div className="preset-buttons">
      <div className="preset-row">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="btn-preset btn-preset-add"
            onClick={() => onAddHours(preset.hours)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {showSubtract && (
        <div className="preset-row">
          {subtractPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="btn-preset btn-preset-sub"
              onClick={() => onAddHours(preset.hours)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface QuickSetButtonsProps {
  workHoursPerDay: number;
  onSetHours: (hours: number) => void;
}

export function QuickSetButtons({
  workHoursPerDay,
  onSetHours,
}: QuickSetButtonsProps) {
  const presets = [
    { label: '1h', hours: 1 },
    { label: '2h', hours: 2 },
    { label: '반차', hours: Math.floor(workHoursPerDay / 2) },
    { label: '1일', hours: workHoursPerDay },
  ];

  return (
    <div className="quick-set-buttons">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          className="btn-quick-set"
          onClick={() => onSetHours(preset.hours)}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
