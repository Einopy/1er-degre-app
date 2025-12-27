import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CustomWheelPicker } from "./CustomWheelPicker";

interface TimePickerWheelProps {
  value: string;
  onChange: (time: string) => void;
  error?: string;
  className?: string;
}

export function TimePickerWheel({ value, onChange, error, className }: TimePickerWheelProps) {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i.toString(),
  }));

  const minutes = Array.from({ length: 60 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i.toString(),
  }));

  const [selectedHour, setSelectedHour] = React.useState<string>(() => {
    if (value) {
      const [h] = value.split(':');
      return h;
    }
    return new Date().getHours().toString();
  });

  const [selectedMinute, setSelectedMinute] = React.useState<string>(() => {
    if (value) {
      const [, m] = value.split(':');
      const minuteValue = parseInt(m, 10);
      return minuteValue.toString();
    }
    return new Date().getMinutes().toString();
  });

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        setSelectedHour(h.toString());
        setSelectedMinute(m.toString());
      }
    }
  }, [value]);

  React.useEffect(() => {
    const hourPadded = selectedHour.padStart(2, '0');
    const minutePadded = selectedMinute.padStart(2, '0');
    const timeString = `${hourPadded}:${minutePadded}`;

    if (timeString !== value) {
      onChange(timeString);
    }
  }, [selectedHour, selectedMinute, onChange, value]);

  const handleHourChange = (newValue: string) => {
    setSelectedHour(newValue);
  };

  const handleMinuteChange = (newValue: string) => {
    setSelectedMinute(newValue);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="time-picker">
        Heure de début<span className="text-destructive ml-1">*</span>
      </Label>

      <div
        className="relative flex items-center justify-center gap-4 bg-muted/20 rounded-xl p-6 border-2 border-border/50"
        style={{ height: '224px' }}
      >
        <div className="flex-1 max-w-[140px]">
          <CustomWheelPicker
            options={hours}
            value={selectedHour}
            onChange={handleHourChange}
            itemHeight={40}
            visibleItems={5}
          />
        </div>

        <span className="text-3xl font-semibold text-foreground select-none" style={{ marginTop: '-10px' }}>
          :
        </span>

        <div className="flex-1 max-w-[140px]">
          <CustomWheelPicker
            options={minutes}
            value={selectedMinute}
            onChange={handleMinuteChange}
            itemHeight={40}
            visibleItems={5}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-sm text-muted-foreground">Faites défiler pour sélectionner l'heure</p>
    </div>
  );
}
