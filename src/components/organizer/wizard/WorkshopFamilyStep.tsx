import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkshopWizardData } from '@/lib/workshop-wizard-types';
import type { User, WorkshopFamily } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';

interface WorkshopFamilyStepProps {
  form: UseFormReturn<WorkshopWizardData>;
  user: User;
  validationError?: string;
  families?: WorkshopFamily[];
}

export function WorkshopFamilyStep({ form, validationError, families }: WorkshopFamilyStepProps) {
  const { watch, setValue } = form;
  const workshopFamilyId = watch('workshop_family_id');
  const { permissions } = useAuth();

  // Extraire les codes de famille depuis les permissions de l'utilisateur
  const userFamilyCodes = new Set(
    (permissions?.roleLevels || [])
      .map(rl => rl.role_level?.workshop_family?.code)
      .filter((code): code is string => !!code)
  );
  
  const availableFamilies = (families || []).filter(f => userFamilyCodes.has(f.code));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Fresques disponibles
          <span className="text-destructive ml-1">*</span>
        </Label>
        <RadioGroup
          value={workshopFamilyId}
          onValueChange={(value) => setValue('workshop_family_id', value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible"
        >
          {availableFamilies.find(f => f.code === 'FDFP') && (
            <div className="relative">
              <RadioGroupItem value={availableFamilies.find(f => f.code === 'FDFP')!.id} id="brand-fdfp" className="peer sr-only" />
              <Label
                htmlFor="brand-fdfp"
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 bg-card p-8 cursor-pointer transition-all duration-200",
                  "hover:shadow-md hover:border-blue-300",
                  "peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:shadow-md",
                  "peer-data-[state=checked]:bg-blue-50"
                )}
              >
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold text-blue-700">F</span>
                </div>
                <span className="text-2xl font-bold mb-2">FDFP</span>
                <span className="text-sm text-muted-foreground text-center">
                  Fresque du Faire ensemble
                </span>
              </Label>
            </div>
          )}
          {availableFamilies.find(f => f.code === 'HD') && (
            <div className="relative">
              <RadioGroupItem value={availableFamilies.find(f => f.code === 'HD')!.id} id="brand-hd" className="peer sr-only" />
              <Label
                htmlFor="brand-hd"
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border-2 bg-card p-8 cursor-pointer transition-all duration-200",
                  "hover:shadow-md hover:border-emerald-300",
                  "peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:shadow-md",
                  "peer-data-[state=checked]:bg-emerald-50"
                )}
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <span className="text-4xl font-bold text-emerald-700">H</span>
                </div>
                <span className="text-2xl font-bold mb-2">HD</span>
                <span className="text-sm text-muted-foreground text-center">
                  Hackons le Débat
                </span>
              </Label>
            </div>
          )}
        </RadioGroup>
        {availableFamilies.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vous n'avez pas les permissions pour créer des ateliers.
            </AlertDescription>
          </Alert>
        )}
        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
