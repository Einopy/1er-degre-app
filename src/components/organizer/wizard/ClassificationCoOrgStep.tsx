import { useState, useEffect, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Briefcase, GraduationCap, Landmark, User, Building2, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkshopWizardData } from '@/lib/workshop-wizard-types';
import type { WorkshopType } from '@/lib/database.types';
import { resolveClassification, isClassificationComplete, type ClassificationChoice } from '@/lib/classification-resolver';

interface ClassificationCoOrgStepProps {
  form: UseFormReturn<WorkshopWizardData>;
  workshopTypes?: WorkshopType[];
  validationError?: string;
  onScrollToBottom?: () => void;
}

export function ClassificationCoOrgStep({ form, workshopTypes, validationError, onScrollToBottom }: ClassificationCoOrgStepProps) {
  const { watch, setValue } = form;
  const workshopTypeId = watch('workshop_type_id');

  const selectedType = (workshopTypes || []).find(t => t.id === workshopTypeId);
  const isTrainingType = selectedType?.is_formation || false;

  const [classificationChoice, setClassificationChoice] = useState<ClassificationChoice>({
    audience: 'grand_public' as const,
    situation: undefined,
  });

  const classificationSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTrainingType) {
      setValue('classification_status', 'formation');
      return;
    }

    const result = resolveClassification(classificationChoice);
    if (result && isClassificationComplete(classificationChoice)) {
      setValue('classification_status', result.status);
    } else {
      setValue('classification_status', '');
    }
  }, [classificationChoice, setValue, isTrainingType]);

  useEffect(() => {
    if (classificationChoice.organization || classificationChoice.subAudience || classificationChoice.situation) {
      onScrollToBottom?.();
    }
  }, [classificationChoice.organization, classificationChoice.subAudience, classificationChoice.situation, onScrollToBottom]);

  const classificationResult = isClassificationComplete(classificationChoice)
    ? resolveClassification(classificationChoice)
    : null;

  if (isTrainingType) {
    return (
      <div className="space-y-6">
        <Alert>
          <GraduationCap className="h-4 w-4" />
          <AlertDescription>
            Les formations sont automatiquement classées.
          </AlertDescription>
        </Alert>

        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div ref={classificationSectionRef} className="space-y-4">
        <div className="space-y-3">
          <Label className="text-base font-semibold">
            Type d'audience
            <span className="text-destructive ml-1">*</span>
          </Label>
          <RadioGroup
            value={classificationChoice.audience}
            onValueChange={(value) => setClassificationChoice({
              audience: value as ClassificationChoice['audience'],
              organization: undefined,
              subAudience: undefined,
              situation: undefined,
            })}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Card
              className={cn(
                "cursor-pointer transition-all",
                classificationChoice.audience === 'grand_public'
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/30"
              )}
              onClick={() => setClassificationChoice({
                audience: 'grand_public',
                organization: undefined,
                subAudience: undefined,
                situation: undefined,
              })}
            >
              <CardContent className="p-4">
                <RadioGroupItem value="grand_public" id="aud-gp" className="sr-only" />
                <div className="flex flex-col items-center text-center">
                  <Users className="w-10 h-10 mb-2 text-primary" />
                  <h4 className="font-medium mb-1">Grand Public</h4>
                  <p className="text-xs text-muted-foreground">Atelier ouvert à tous</p>
                  {classificationChoice.audience === 'grand_public' && (
                    <CheckCircle className="w-4 h-4 text-primary mt-2" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-all",
                classificationChoice.audience === 'pro'
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/30"
              )}
              onClick={() => setClassificationChoice({
                audience: 'pro',
                organization: undefined,
                subAudience: undefined,
                situation: undefined,
              })}
            >
              <CardContent className="p-4">
                <RadioGroupItem value="pro" id="aud-pro" className="sr-only" />
                <div className="flex flex-col items-center text-center">
                  <Briefcase className="w-10 h-10 mb-2 text-primary" />
                  <h4 className="font-medium mb-1">Professionnels</h4>
                  <p className="text-xs text-muted-foreground">Organisations et entreprises</p>
                  {classificationChoice.audience === 'pro' && (
                    <CheckCircle className="w-4 h-4 text-primary mt-2" />
                  )}
                </div>
              </CardContent>
            </Card>
          </RadioGroup>
        </div>

        {classificationChoice.audience === 'pro' && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
            <Label className="text-base font-semibold">
              Type d'organisation
              <span className="text-destructive ml-1">*</span>
            </Label>
            <RadioGroup
              value={classificationChoice.organization || ''}
              onValueChange={(value) => setClassificationChoice(prev => ({
                ...prev,
                organization: value as ClassificationChoice['organization'],
                subAudience: undefined,
                situation: undefined,
              }))}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {(['association', 'entreprise', 'enseignement', 'pouvoir_public'] as const).map((org) => {
                const labels = {
                  association: { label: 'Association', desc: 'Organisation à but non lucratif', icon: Users },
                  entreprise: { label: 'Entreprise', desc: 'Secteur privé', icon: Briefcase },
                  enseignement: { label: 'Enseignement', desc: 'Établissement scolaire', icon: GraduationCap },
                  pouvoir_public: { label: 'Pouvoir Public', desc: 'Administration publique', icon: Landmark },
                };
                const { label, desc, icon: Icon } = labels[org];

                return (
                  <Card
                    key={org}
                    className={cn(
                      "cursor-pointer transition-all",
                      classificationChoice.organization === org
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/30"
                    )}
                    onClick={() => setClassificationChoice(prev => ({
                      ...prev,
                      organization: org,
                      subAudience: undefined,
                      situation: undefined,
                    }))}
                  >
                    <CardContent className="p-4">
                      <RadioGroupItem value={org} id={`org-${org}`} className="sr-only" />
                      <div className="flex items-center">
                        <Icon className="w-8 h-8 mr-3 text-primary" />
                        <div className="flex-1">
                          <h4 className="font-medium">{label}</h4>
                          <p className="text-sm text-muted-foreground">{desc}</p>
                        </div>
                        {classificationChoice.organization === org && (
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </RadioGroup>
          </div>
        )}

        {(classificationChoice.organization === 'enseignement' || classificationChoice.organization === 'pouvoir_public') && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
            <Label className="text-base font-semibold">
              Public cible
              <span className="text-destructive ml-1">*</span>
            </Label>
            <RadioGroup
              value={classificationChoice.subAudience || ''}
              onValueChange={(value) => setClassificationChoice(prev => ({
                ...prev,
                subAudience: value as ClassificationChoice['subAudience'],
                situation: undefined,
              }))}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {classificationChoice.organization === 'enseignement' ? (
                <>
                  <Card
                    className={cn(
                      "cursor-pointer transition-all",
                      classificationChoice.subAudience === 'profs'
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/30"
                    )}
                    onClick={() => setClassificationChoice(prev => ({
                      ...prev,
                      subAudience: 'profs',
                      situation: undefined,
                    }))}
                  >
                    <CardContent className="p-4">
                      <RadioGroupItem value="profs" id="sub-prof" className="sr-only" />
                      <div className="flex items-center">
                        <GraduationCap className="w-8 h-8 mr-3 text-primary" />
                        <div className="flex-1">
                          <h4 className="font-medium">Professeurs</h4>
                        </div>
                        {classificationChoice.subAudience === 'profs' && (
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      "cursor-pointer transition-all",
                      classificationChoice.subAudience === 'etudiants_alumnis'
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/30"
                    )}
                    onClick={() => setClassificationChoice(prev => ({
                      ...prev,
                      subAudience: 'etudiants_alumnis',
                      situation: undefined,
                    }))}
                  >
                    <CardContent className="p-4">
                      <RadioGroupItem value="etudiants_alumnis" id="sub-etu" className="sr-only" />
                      <div className="flex items-center">
                        <Users className="w-8 h-8 mr-3 text-primary" />
                        <div className="flex-1">
                          <h4 className="font-medium">Étudiants/Alumnis</h4>
                        </div>
                        {classificationChoice.subAudience === 'etudiants_alumnis' && (
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card
                    className={cn(
                      "cursor-pointer transition-all",
                      classificationChoice.subAudience === 'elus'
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/30"
                    )}
                    onClick={() => setClassificationChoice(prev => ({
                      ...prev,
                      subAudience: 'elus',
                      situation: undefined,
                    }))}
                  >
                    <CardContent className="p-4">
                      <RadioGroupItem value="elus" id="sub-elu" className="sr-only" />
                      <div className="flex items-center">
                        <Landmark className="w-8 h-8 mr-3 text-primary" />
                        <div className="flex-1">
                          <h4 className="font-medium">Élus</h4>
                        </div>
                        {classificationChoice.subAudience === 'elus' && (
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      "cursor-pointer transition-all",
                      classificationChoice.subAudience === 'agents'
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/30"
                    )}
                    onClick={() => setClassificationChoice(prev => ({
                      ...prev,
                      subAudience: 'agents',
                      situation: undefined,
                    }))}
                  >
                    <CardContent className="p-4">
                      <RadioGroupItem value="agents" id="sub-agent" className="sr-only" />
                      <div className="flex items-center">
                        <User className="w-8 h-8 mr-3 text-primary" />
                        <div className="flex-1">
                          <h4 className="font-medium">Agents</h4>
                        </div>
                        {classificationChoice.subAudience === 'agents' && (
                          <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </RadioGroup>
          </div>
        )}

        {classificationChoice.organization && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
            <Label className="text-base font-semibold">
              Contexte
              <span className="text-destructive ml-1">*</span>
            </Label>
            <RadioGroup
              value={classificationChoice.situation || ''}
              onValueChange={(value) => setClassificationChoice(prev => ({
                ...prev,
                situation: value as ClassificationChoice['situation'],
              }))}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <Card
                className={cn(
                  "cursor-pointer transition-all",
                  classificationChoice.situation === 'internal'
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/30"
                )}
                onClick={() => setClassificationChoice(prev => ({
                  ...prev,
                  situation: 'internal',
                }))}
              >
                <CardContent className="p-4">
                  <RadioGroupItem value="internal" id="ctx-int" className="sr-only" />
                  <div className="flex items-center">
                    <Building2 className="w-8 h-8 mr-3 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-medium">Interne</h4>
                      <p className="text-sm text-muted-foreground">Pour l'organisation elle-même</p>
                    </div>
                    {classificationChoice.situation === 'internal' && (
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer transition-all",
                  classificationChoice.situation === 'external'
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-primary/30"
                )}
                onClick={() => setClassificationChoice(prev => ({
                  ...prev,
                  situation: 'external',
                }))}
              >
                <CardContent className="p-4">
                  <RadioGroupItem value="external" id="ctx-ext" className="sr-only" />
                  <div className="flex items-center">
                    <Briefcase className="w-8 h-8 mr-3 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-medium">Prestataire externe</h4>
                      <p className="text-sm text-muted-foreground">Intervenant extérieur</p>
                    </div>
                    {classificationChoice.situation === 'external' && (
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>
          </div>
        )}

        {classificationResult && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Classification:</strong> {classificationResult.label}
            </AlertDescription>
          </Alert>
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
