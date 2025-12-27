import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, GraduationCap, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkshopWizardData } from '@/lib/workshop-wizard-types';
import type { User as UserType, WorkshopFamily, WorkshopType } from '@/lib/database.types';
import { hasRole } from '@/lib/organizer-utils';
import { LanguageSelectorCSS as LanguageSelector } from './LanguageSelectorCSS';

interface EventTypeLanguageStepProps {
  form: UseFormReturn<WorkshopWizardData>;
  user: UserType;
  validationError?: string;
  families?: WorkshopFamily[];
  workshopTypes?: WorkshopType[];
}

export function EventTypeLanguageStep({ form, user, validationError, families, workshopTypes }: EventTypeLanguageStepProps) {
  const { watch, setValue } = form;
  const workshopFamilyId = watch('workshop_family_id');
  const workshopTypeId = watch('workshop_type_id');
  const languageCode = watch('language_code');

  const [showFormationSubtypes, setShowFormationSubtypes] = useState(false);
  const [primaryTypeSelection, setPrimaryTypeSelection] = useState<'workshop' | 'formation' | null>(null);

  const selectedFamily = (families || []).find(f => f.id === workshopFamilyId);
  const familyCode = selectedFamily?.code || '';

  const availableTypes = (workshopTypes || []).filter(t =>
    t.workshop_family_id === workshopFamilyId && t.is_active
  );

  const workshopTypeOption = availableTypes.find(t => !t.is_formation);
  const formationTypes = availableTypes.filter(t => t.is_formation);

  const selectedType = availableTypes.find(t => t.id === workshopTypeId);

  useEffect(() => {
    if (selectedType && !selectedType.is_formation) {
      setPrimaryTypeSelection('workshop');
      setShowFormationSubtypes(false);
    } else if (selectedType && selectedType.is_formation) {
      setPrimaryTypeSelection('formation');
      setShowFormationSubtypes(true);
    }
  }, [selectedType]);

  const hasTrainerPermission = () => {
    if (!familyCode) return false;
    return hasRole(user, `${familyCode}_trainer`) || hasRole(user, `${familyCode}_instructor`);
  };

  const getAvailableFormationTypes = () => {
    if (!familyCode) return [];

    return formationTypes.filter((type) => {
      if (type.code.includes('pro_1') || type.code.includes('pro_2') || type.code.includes('formateur')) {
        return hasRole(user, `${familyCode}_instructor`);
      }
      return hasRole(user, `${familyCode}_trainer`) || hasRole(user, `${familyCode}_instructor`);
    });
  };

  const availableFormationTypes = getAvailableFormationTypes();
  const shouldShowFormationOption = hasTrainerPermission();

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
      <div className="space-y-4">
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Type d'évènement
            <span className="text-destructive ml-1">*</span>
          </Label>
          {!workshopFamilyId ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Veuillez d'abord sélectionner une fresque.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mb-3",
                      primaryTypeSelection === 'workshop'
                        ? "bg-primary/20"
                        : "bg-muted"
                    )}>
                      <Users className={cn(
                        "w-8 h-8",
                        primaryTypeSelection === 'workshop' ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Atelier</h3>
                    <p className="text-sm text-muted-foreground">Atelier ouvert au public</p>
                    {primaryTypeSelection === 'workshop' && (
                      <CheckCircle className="w-5 h-5 text-primary absolute top-4 right-4" />
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
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mb-3",
                      primaryTypeSelection === 'formation'
                        ? "bg-primary/20"
                        : "bg-muted"
                    )}>
                      <GraduationCap className={cn(
                        "w-8 h-8",
                        primaryTypeSelection === 'formation' ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Formation</h3>
                    <p className="text-sm text-muted-foreground">Formation pour facilitateurs</p>
                    {primaryTypeSelection === 'formation' && (
                      <CheckCircle className="w-5 h-5 text-primary absolute top-4 right-4" />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {showFormationSubtypes && availableFormationTypes.length > 0 && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
            <Label className="text-base font-semibold">
              Type de formation
              <span className="text-destructive ml-1">*</span>
            </Label>
            <div className="grid grid-cols-1 gap-3">
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
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{type.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        Durée: {type.default_duration_minutes} min
                      </p>
                    </div>
                    {workshopTypeId === type.id && (
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Langue de l'évènement
          <span className="text-destructive ml-1">*</span>
        </Label>
        {!workshopFamilyId ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Veuillez d'abord sélectionner une fresque.
            </AlertDescription>
          </Alert>
        ) : (
          <LanguageSelector
            value={(languageCode || 'fr') as any}
            onChange={(value) => setValue('language_code', value as string)}
          />
        )}
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
