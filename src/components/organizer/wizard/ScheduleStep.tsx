import { useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { WorkshopWizardData } from '@/lib/workshop-wizard-types';
import { DateTimePicker as DateTimePicker } from './DateTimePicker';

interface ScheduleStepProps {
  form: UseFormReturn<WorkshopWizardData>;
  isPastWorkshop?: boolean;
  validationError?: string;
}

export function ScheduleStep({ form, isPastWorkshop = false, validationError }: ScheduleStepProps) {
  const { watch, setValue } = form;
  const extraMinutes = watch('extra_duration_minutes') || 0;
  const startDate = watch('start_at');
  const startTime = watch('start_time');
  const [dateError, setDateError] = useState<string>('');

  const baseDuration = 180;

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const now = new Date();
      const nowDateOnly = new Date(now);
      nowDateOnly.setHours(0, 0, 0, 0);
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      if (isPastWorkshop) {
        const isValid = dateOnly <= nowDateOnly;
        if (!isValid) {
          setDateError('La date doit être dans le passé ou aujourd\'hui');
        } else {
          setDateError('');
        }
      } else {
        const isValid = dateOnly >= nowDateOnly;
        if (!isValid) {
          setDateError('La date doit être aujourd\'hui ou dans le futur');
        } else {
          setDateError('');
        }
      }
    }
    setValue('start_at', date || new Date());
  };

  const handleTimeChange = (time: string) => {
    setValue('start_time', time);
  };

  return (
    <div className="space-y-6">
      <DateTimePicker
        date={startDate}
        time={startTime}
        onDateChange={handleDateChange}
        onTimeChange={handleTimeChange}
        isPastWorkshop={isPastWorkshop}
        error={dateError}
        baseDuration={baseDuration}
        extraDurationMinutes={extraMinutes}
        onExtraDurationChange={(minutes) => setValue('extra_duration_minutes', minutes)}
      />

      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
