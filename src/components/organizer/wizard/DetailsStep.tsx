import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Users } from 'lucide-react';
import type { WorkshopWizardData } from '@/lib/workshop-wizard-types';

interface DetailsStepProps {
  form: UseFormReturn<WorkshopWizardData>;
  validationError?: string;
}

export function DetailsStep({ form, validationError }: DetailsStepProps) {
  const { watch, setValue, register, formState: { errors } } = form;
  const capacity = watch('audience_number') || 12;

  const isFormation = false;

  const titleLabel = isFormation ? "Titre de la formation" : "Titre de l'atelier";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">
            {titleLabel}
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="title"
            {...register('title', {
              required: 'Le titre est requis',
              minLength: { value: 3, message: 'Le titre doit contenir au moins 3 caractères' }
            })}
            placeholder={isFormation ? "Ex: Formation initiale FDFP - Paris" : "Ex: Fresque du Faire ensemble à Paris"}
            maxLength={200}
          />
          {errors.title && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            Description
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Textarea
            id="description"
            {...register('description', {
              required: 'La description est requise',
              minLength: { value: 10, message: 'La description doit contenir au moins 10 caractères' }
            })}
            placeholder="Décrivez les objectifs et le contenu de l'atelier..."
            rows={4}
            maxLength={2000}
          />
          {errors.description && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <Label htmlFor="capacity">
            Capacité maximale
            <span className="text-destructive ml-1">*</span>
          </Label>

          <div className="flex items-center gap-6">
            <div className="flex-1">
              <Slider
                id="capacity"
                min={1}
                max={20}
                step={1}
                value={[capacity]}
                onValueChange={(values) => setValue('audience_number', values[0])}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2 min-w-[100px]">
              <Users className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">{capacity}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Nombre maximum de participants pour cet atelier
          </p>
        </div>
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
