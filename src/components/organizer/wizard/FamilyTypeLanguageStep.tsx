import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, GraduationCap, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkshopWizardData } from '@/lib/workshop-wizard-types';
import type { WorkshopFamily, WorkshopType } from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSelectorCSS as LanguageSelector } from './LanguageSelectorCSS';

interface FamilyTypeLanguageStepProps {
  form: UseFormReturn<WorkshopWizardData>;
  validationError?: string;
  families?: WorkshopFamily[];
  workshopTypes?: WorkshopType[];
}

export function FamilyTypeLanguageStep({ form, validationError, families, workshopTypes }: FamilyTypeLanguageStepProps) {
  const { watch, setValue } = form;
  const { permissions } = useAuth();
  const workshopFamilyId = watch('workshop_family_id');
  const workshopTypeId = watch('workshop_type_id');
  const languageCode = watch('language_code');

  const [showFormationSubtypes, setShowFormationSubtypes] = useState(false);
  const [primaryTypeSelection, setPrimaryTypeSelection] = useState<'workshop' | 'formation' | null>(null);

  // Extraire les codes de famille depuis les permissions de l'utilisateur
  const userFamilyCodes = new Set(
    (permissions?.roleLevels || [])
      .map(rl => rl.role_level?.workshop_family?.code)
      .filter((code): code is string => !!code)
  );
  
  const availableFamilies = (families || []).filter(f => userFamilyCodes.has(f.code));

  const selectedFamily = availableFamilies.find(f => f.id === workshopFamilyId);
  const familyCode = selectedFamily?.code || '';

  // Helper pour obtenir le niveau max de l'utilisateur pour une famille
  const getUserMaxLevelForFamily = (familyId: string): number => {
    const levels = (permissions?.roleLevels || [])
      .filter(rl => rl.role_level?.workshop_family_id === familyId)
      .map(rl => rl.role_level?.level || 0);
    return levels.length > 0 ? Math.max(...levels) : 0;
  };

  const userMaxLevel = workshopFamilyId ? getUserMaxLevelForFamily(workshopFamilyId) : 0;

  const availableTypes = (workshopTypes || []).filter(t =>
    t.workshop_family_id === workshopFamilyId && t.is_active
  );

  const workshopTypeOption = availableTypes.find(t => !t.is_formation);
  const formationTypes = availableTypes.filter(t => t.is_formation);

  const selectedType = availableTypes.find(t => t.id === workshopTypeId);

  // Niveau 3 = trainer, Niveau 4 = instructor
  const hasTrainerPermission = (): boolean => {
    return userMaxLevel >= 3;
  };

  const getAvailableFormationTypes = () => {
    if (!familyCode) return [];

    return formationTypes.filter((type) => {
      if (type.code.includes('pro_1') || type.code.includes('pro_2') || type.code.includes('formateur')) {
        return userMaxLevel >= 4;
      }
      return userMaxLevel >= 3;
    });
  };

  const availableFormationTypes = getAvailableFormationTypes();
  const shouldShowFormationOption = hasTrainerPermission();

  useEffect(() => {
    if (selectedType && !selectedType.is_formation) {
      setPrimaryTypeSelection('workshop');
      setShowFormationSubtypes(false);
    } else if (selectedType && selectedType.is_formation) {
      setPrimaryTypeSelection('formation');
      setShowFormationSubtypes(true);
    }
  }, [selectedType]);

  const handlePrimaryTypeClick = (type: 'workshop' | 'formation') => {
    setPrimaryTypeSelection(type);

    if (type === 'workshop' && workshopTypeOption) {
      setValue('workshop_type_id', workshopTypeOption.id);
      setShowFormationSubtypes(false);
    } else if (type === 'formation') {
      setShowFormationSubtypes(true);
      if (availableFormationTypes.length > 0) {
        setValue('workshop_type_id', availableFormationTypes[0].id);
      }
    }
  };

  const handleFormationSubtypeClick = (typeId: string) => {
    setValue('workshop_type_id', typeId);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Sélection de la fresque */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Fresque
          <span className="text-destructive ml-1">*</span>
        </Label>
        {availableFamilies.length === 0 ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Vous n'avez pas les permissions pour créer des ateliers.
            </AlertDescription>
          </Alert>
        ) : (
          <RadioGroup
            value={workshopFamilyId}
            onValueChange={(value) => {
              setValue('workshop_family_id', value);
              setValue('workshop_type_id', '');
              setPrimaryTypeSelection(null);
              setShowFormationSubtypes(false);
            }}
            className="grid grid-cols-2 gap-4"
          >
            {availableFamilies.find(f => f.code === 'FDFP') && (
              <div className="relative">
                <RadioGroupItem value={availableFamilies.find(f => f.code === 'FDFP')!.id} id="brand-fdfp" className="peer sr-only" />
                <Label
                  htmlFor="brand-fdfp"
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border-2 bg-card p-4 cursor-pointer transition-all duration-200",
                    "hover:shadow-md hover:border-blue-300",
                    "peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:shadow-md",
                    "peer-data-[state=checked]:bg-blue-50"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold text-blue-700">F</span>
                  </div>
                  <span className="text-lg font-bold">FDFP</span>
                  <span className="text-xs text-muted-foreground text-center">
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
                    "flex flex-col items-center justify-center rounded-xl border-2 bg-card p-4 cursor-pointer transition-all duration-200",
                    "hover:shadow-md hover:border-emerald-300",
                    "peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:shadow-md",
                    "peer-data-[state=checked]:bg-emerald-50"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
                    <span className="text-2xl font-bold text-emerald-700">H</span>
                  </div>
                  <span className="text-lg font-bold">HD</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Hackons le Débat
                  </span>
                </Label>
              </div>
            )}
          </RadioGroup>
        )}
      </div>

      {/* Section 2: Type d'événement */}
      {workshopFamilyId && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
          <Label className="text-base font-semibold">
            Type d'évènement
            <span className="text-destructive ml-1">*</span>
          </Label>
          <div className="grid grid-cols-2 gap-4">
            {workshopTypeOption && (
              <Card
                key="workshop"
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  primaryTypeSelection === 'workshop'
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-muted hover:border-primary/50"
                )}
                onClick={() => handlePrimaryTypeClick('workshop')}
              >
                <CardContent className="p-4 flex flex-col items-center text-center relative">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                    primaryTypeSelection === 'workshop'
                      ? "bg-primary/20"
                      : "bg-muted"
                  )}>
                    <Users className={cn(
                      "w-6 h-6",
                      primaryTypeSelection === 'workshop' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <h3 className="font-semibold">Atelier</h3>
                  <p className="text-xs text-muted-foreground">Atelier ouvert au public</p>
                  {primaryTypeSelection === 'workshop' && (
                    <CheckCircle className="w-4 h-4 text-primary absolute top-2 right-2" />
                  )}
                </CardContent>
              </Card>
            )}

            {shouldShowFormationOption && formationTypes.length > 0 && (
              <Card
                key="formation"
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  primaryTypeSelection === 'formation'
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-muted hover:border-primary/50"
                )}
                onClick={() => handlePrimaryTypeClick('formation')}
              >
                <CardContent className="p-4 flex flex-col items-center text-center relative">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-2",
                    primaryTypeSelection === 'formation'
                      ? "bg-primary/20"
                      : "bg-muted"
                  )}>
                    <GraduationCap className={cn(
                      "w-6 h-6",
                      primaryTypeSelection === 'formation' ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <h3 className="font-semibold">Formation</h3>
                  <p className="text-xs text-muted-foreground">Formation facilitateurs</p>
                  {primaryTypeSelection === 'formation' && (
                    <CheckCircle className="w-4 h-4 text-primary absolute top-2 right-2" />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sous-types de formation */}
          {showFormationSubtypes && availableFormationTypes.length > 0 && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
              <Label className="text-sm font-medium text-muted-foreground">
                Type de formation
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {availableFormationTypes.map((type) => (
                  <Card
                    key={type.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-sm",
                      workshopTypeId === type.id
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/30"
                    )}
                    onClick={() => handleFormationSubtypeClick(type.id)}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">{type.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          Durée: {type.default_duration_minutes} min
                        </p>
                      </div>
                      {workshopTypeId === type.id && (
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Langue */}
      {workshopTypeId && (
        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
          <Label className="text-base font-semibold">
            Langue de l'évènement
            <span className="text-destructive ml-1">*</span>
          </Label>
          <LanguageSelector
            value={(languageCode || 'fr') as any}
            onChange={(value) => setValue('language_code', value as string)}
          />
        </div>
      )}

      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
