import * as React from "react";
import { format, addMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TimePickerWheel } from "./TimePickerWheel";

interface DateTimePickerProps {
  date: Date | undefined;
  time: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  isPastWorkshop?: boolean; // true = "Déclarer" (past), false = "Planifier" (future)
  error?: string;
  className?: string;
  // New props for duration management
  baseDuration?: number; // in minutes
  extraDurationMinutes?: number;
  onExtraDurationChange?: (minutes: number) => void;
}

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  isPastWorkshop = false,
  error,
  className,
  baseDuration = 0,
  extraDurationMinutes = 0,
  onExtraDurationChange,
}: DateTimePickerProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  // Today at midnight (local)
  const today = React.useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // For future workshops, allow today and beyond; for past, allow today and before
  const disabled = React.useMemo(() => {
    if (isPastWorkshop) {
      // Declarer mode: allow today and before (disable tomorrow onwards)
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { after: today };
    } else {
      // Planifier mode: allow today and future (disable yesterday and before)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { before: today };
    }
  }, [isPastWorkshop, today]);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onDateChange(selectedDate);
    // OPTIONAL: comment out next line if you want to allow picking again before closing
    setIsCalendarOpen(false);
  };

  // Calculate total duration and end time
  const totalDuration = baseDuration + extraDurationMinutes;

  const endTime = React.useMemo(() => {
    if (!date || !time || !baseDuration) return null;

    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    const startDateTime = new Date(date);
    startDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = addMinutes(startDateTime, totalDuration);

    const endHours = endDateTime.getHours();
    const endMinutes = endDateTime.getMinutes();

    return `${endHours}h${endMinutes.toString().padStart(2, '0')}`;
  }, [date, time, totalDuration, baseDuration]);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}` : `${hours}h00`;
  };

  const handleIncrement = () => {
    if (onExtraDurationChange && extraDurationMinutes < 480) {
      onExtraDurationChange(Math.min(extraDurationMinutes + 15, 480));
    }
  };

  const handleReset = () => {
    if (onExtraDurationChange) {
      onExtraDurationChange(0);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor="workshop-date">
          Date<span className="text-destructive ml-1">*</span>
        </Label>

        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              id="workshop-date"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground",
                error && "border-destructive"
              )}
              aria-describedby={error ? "date-error" : undefined}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: fr }) : <span>Sélectionner une date</span>}
            </Button>
          </PopoverTrigger>

          {/* Keep the popover fully interactive */}
          <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={disabled}
              initialFocus={false}
              locale={fr}
              // 🔒 Inline styles guarantee white-on-black for the selected day
              modifiersStyles={{
                selected: {
                  backgroundColor: "black",
                  color: "white",
                  borderRadius: 6,
                },
                disabled: {
                  color: "hsl(var(--muted-foreground))",
                  opacity: 0.5,
                  pointerEvents: "none",
                },
              }}
            />
          </PopoverContent>
        </Popover>

        {error && (
          <p id="date-error" className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {isPastWorkshop
            ? "Sélectionnez la date à laquelle l'atelier a eu lieu"
            : "Sélectionnez la date de votre atelier"}
        </p>
      </div>

      <TimePickerWheel
        value={time}
        onChange={onTimeChange}
        error={error}
      />

      {/* End time and duration controls - only show if baseDuration is provided */}
      {baseDuration > 0 && onExtraDurationChange && endTime && (
        <div className="space-y-2">
          <Label>Heure de fin</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Left: End Time Display (70%) */}
            <div className="flex-[7] rounded-md border border-input bg-muted/50 px-3 py-2 flex items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">{endTime}</span>
            </div>

            {/* Middle: +15 mins button (15%) */}
            <Button
              type="button"
              variant="outline"
              className="flex-[1.5] h-auto"
              onClick={handleIncrement}
              disabled={extraDurationMinutes >= 480}
            >
              +15 mins
            </Button>

            {/* Right: Reset icon button (15%) */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="flex-[1.5] h-auto w-full sm:w-auto"
              onClick={handleReset}
              disabled={extraDurationMinutes === 0}
              title="Réinitialiser le temps additionnel"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Durée totale : {formatDuration(totalDuration)}
            {extraDurationMinutes > 0 && ` (durée de base: ${formatDuration(baseDuration)} + ${extraDurationMinutes} min)`}
          </p>
        </div>
      )}
    </div>
  );
}
