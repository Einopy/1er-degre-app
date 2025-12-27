import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveClient } from '@/hooks/use-active-client';
import { useWorkshopFamilies, useWorkshopTypes } from '@/hooks/use-client-config';
import type { WorkshopWizardData, WizardStep } from '@/lib/workshop-wizard-types';
import { WIZARD_STEPS } from '@/lib/workshop-wizard-types';
import { WorkshopFamilyStep } from './WorkshopFamilyStep';
import { EventTypeLanguageStep } from './EventTypeLanguageStep';
import { ClassificationCoOrgStep } from './ClassificationCoOrgStep';
import { DetailsStep } from './DetailsStep';
import { ScheduleStep } from './ScheduleStep';
import { LocationStep } from './LocationStep';
import { ReviewStep } from './ReviewStep';
import { GradientProgress } from './GradientProgress';
import { createPlannedWorkshop, createDeclaredWorkshop } from '@/services/organizer-workshops';
import { calculateEndTime } from '@/lib/workshop-utils';
import { downloadICS } from '@/lib/ics-generator';
import { insertCoOrganizers } from '@/services/co-organizers';

interface WorkshopWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPastWorkshop?: boolean;
}

export function WorkshopWizard({ open, onOpenChange, isPastWorkshop = false }: WorkshopWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { activeClient } = useActiveClient();
  const { families } = useWorkshopFamilies(activeClient?.id);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const { types } = useWorkshopTypes(activeClient?.id, selectedFamilyId || undefined);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [workshopImagePath, setWorkshopImagePath] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }, 100);
  };

  const form = useForm<WorkshopWizardData>({
    defaultValues: {
      workshop_family_id: '',
      language_code: 'fr',
      workshop_type_id: '',
      title: '',
      description: '',
      classification_status: '',
      start_at: new Date(),
      start_time: '',
      extra_duration_minutes: 0,
      audience_number: 12,
      is_remote: false,
      enablePostWorkshopEmails: true,
    },
  });

  const watchedFamilyId = form.watch('workshop_family_id');

  useEffect(() => {
    if (watchedFamilyId && watchedFamilyId !== selectedFamilyId) {
      setSelectedFamilyId(watchedFamilyId);
    }
  }, [watchedFamilyId, selectedFamilyId]);

  const currentStep = WIZARD_STEPS[currentStepIndex];

  const validateCurrentStep = async (): Promise<boolean> => {
    const values = form.getValues();
    setValidationError('');

    switch (currentStep.id) {
      case 'workshop-family':
        if (!values.workshop_family_id) {
          setValidationError('Veuillez sélectionner une fresque.');
          return false;
        }
        return true;

      case 'event-type-language':
        if (!values.workshop_family_id) {
          setValidationError('Veuillez d\'abord sélectionner une fresque.');
          return false;
        }
        if (!values.workshop_type_id) {
          setValidationError('Veuillez sélectionner un type d\'évènement.');
          return false;
        }
        if (!values.language_code) {
          setValidationError('Veuillez sélectionner une langue.');
          return false;
        }
        return true;

      case 'classification-coorg':
        if (!values.classification_status) {
          setValidationError('Veuillez compléter la classification de l\'audience.');
          return false;
        }
        return true;

      case 'details':
        if (!values.title || values.title.length < 3) {
          setValidationError('Veuillez saisir un titre d\'au moins 3 caractères.');
          return false;
        }
        if (!values.description || values.description.length < 10) {
          setValidationError('Veuillez saisir une description d\'au moins 10 caractères.');
          return false;
        }
        if (!values.audience_number || values.audience_number < 1) {
          setValidationError('Veuillez définir une capacité d\'au moins 1 participant.');
          return false;
        }
        return true;

      case 'schedule':
        if (!values.start_at || !values.start_time) {
          setValidationError('Veuillez sélectionner une date et une heure.');
          return false;
        }

        const now = new Date();
        const [hours, minutes] = values.start_time.split(':').map(Number);
        const selectedDateTime = new Date(values.start_at);
        selectedDateTime.setHours(hours, minutes, 0, 0);

        if (isPastWorkshop) {
          if (selectedDateTime >= now) {
            setValidationError('La date et l\'heure doivent être dans le passé.');
            return false;
          }
        } else {
          if (selectedDateTime <= now) {
            setValidationError('La date et l\'heure doivent être dans le futur.');
            return false;
          }
        }
        return true;

      case 'location':
        if (values.is_remote) {
          if (!values.visio_link) {
            setValidationError('Veuillez fournir un lien de visioconférence.');
            return false;
          }
        } else {
          if (!values.location?.venue_name || !values.location?.street ||
              !values.location?.city || !values.location?.postal_code) {
            setValidationError('Veuillez remplir tous les champs obligatoires de l\'adresse.');
            return false;
          }
        }
        return true;

      case 'review':
        return true;

      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStepIndex < WIZARD_STEPS.length - 1) {
      setValidationError('');
      setCurrentStepIndex(currentStepIndex + 1);
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: 0,
            behavior: 'smooth',
          });
        }
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault();
      if (currentStepIndex < WIZARD_STEPS.length - 1) {
        handleNext();
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setValidationError('');
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleEditStep = (step: WizardStep) => {
    const stepIndex = WIZARD_STEPS.findIndex(s => s.id === step);
    if (stepIndex !== -1) {
      setValidationError('');
      setCurrentStepIndex(stepIndex);
    }
  };

  const handleSubmit = async () => {
    if (!profile) {
      console.error('WORKSHOP_CREATE_ERROR: No profile found');
      return;
    }

    console.log('=== WORKSHOP CREATION STARTED ===');
    console.log('User profile:', { id: profile.id, email: profile.email, roles: profile.roles });

    const isValid = await validateCurrentStep();
    if (!isValid) {
      console.warn('WORKSHOP_CREATE_ERROR: Final validation failed');
      return;
    }

    try {
      setIsSubmitting(true);
      const values = form.getValues();

      console.log('Form values:', JSON.stringify(values, null, 2));

      const [hours, minutes] = values.start_time.split(':').map(Number);
      const startDateTime = new Date(values.start_at);
      startDateTime.setHours(hours, minutes, 0, 0);

      const endAt = calculateEndTime(
        startDateTime.toISOString(),
        values.workshop_type_id,
        values.extra_duration_minutes
      );

      const workshopData = {
        title: values.title,
        description: values.description || null,
        workshop_family_id: values.workshop_family_id,
        workshop_type_id: values.workshop_type_id,
        language: values.language_code,
        organizer: profile.id,
        classification_status: values.classification_status || '',
        audience_number: values.audience_number,
        is_remote: values.is_remote,
        visio_link: values.visio_link || null,
        mural_link: values.mural_link || null,
        location: values.location || null,
        start_at: startDateTime.toISOString(),
        end_at: endAt.toISOString(),
        extra_duration_minutes: values.extra_duration_minutes || 0,
        card_illustration_url: workshopImagePath,
      };

      console.log('Workshop data prepared:', JSON.stringify(workshopData, null, 2));
      console.log('Classification status:', workshopData.classification_status);

      if (!workshopData.workshop_family_id) {
        throw new Error('Workshop family is required');
      }
      if (!workshopData.workshop_type_id) {
        throw new Error('Workshop type is required');
      }
      if (!workshopData.classification_status) {
        throw new Error('Classification status is required');
      }
      if (!workshopData.audience_number || workshopData.audience_number < 1) {
        throw new Error('Audience number must be at least 1');
      }
      if (!workshopData.start_at || !workshopData.end_at) {
        throw new Error('Start and end dates are required');
      }
      if (workshopData.is_remote && !workshopData.visio_link) {
        throw new Error('Visio link is required for remote workshops');
      }
      if (!workshopData.is_remote && !workshopData.location) {
        throw new Error('Location is required for in-person workshops');
      }

      console.log('Pre-creation validation passed');
      console.log('Calling', isPastWorkshop ? 'createDeclaredWorkshop' : 'createPlannedWorkshop');

      if (!profile?.id) {
        throw new Error('User profile not found');
      }

      const workshop = isPastWorkshop
        ? await createDeclaredWorkshop(workshopData, profile.id)
        : await createPlannedWorkshop(workshopData, profile.id);

      console.log('Workshop created successfully:', workshop);

      if (values.coOrganizers && values.coOrganizers.length > 0) {
        try {
          await insertCoOrganizers(workshop.id, values.coOrganizers);
          console.log('Co-organizers assigned successfully');
        } catch (err) {
          console.error('Error assigning co-organizers:', err);
        }
      }

      if (!isPastWorkshop) {
        try {
          downloadICS(workshop);
          console.log('ICS file generated successfully');
        } catch (err) {
          console.error('Error generating ICS:', err);
        }
      }

      toast({
        title: isPastWorkshop ? 'Atelier déclaré' : 'Atelier planifié',
        description: isPastWorkshop
          ? 'L\'atelier a été déclaré avec succès.'
          : 'L\'atelier a été créé et publié avec succès. Le fichier ICS a été téléchargé.',
      });

      console.log('=== WORKSHOP CREATION COMPLETED ===');
      onOpenChange(false);
      navigate(`/organizer/workshops/${workshop.id}`);
    } catch (err: any) {
      console.error('=== WORKSHOP CREATION FAILED ===');
      console.error('Error type:', err.constructor.name);
      console.error('Error message:', err.message);
      console.error('Error details:', err);

      if (err.code) {
        console.error('Error code:', err.code);
      }
      if (err.details) {
        console.error('Error details:', err.details);
      }
      if (err.hint) {
        console.error('Error hint:', err.hint);
      }

      let errorMessage = 'Impossible de créer l\'atelier. Veuillez réessayer.';

      if (err.message) {
        if (err.message.includes('permission') || err.message.includes('policy')) {
          errorMessage = 'Vous n\'avez pas les permissions nécessaires pour créer cet atelier.';
        } else if (err.message.includes('duplicate') || err.message.includes('unique')) {
          errorMessage = 'Un atelier similaire existe déjà.';
        } else if (err.message.includes('foreign key') || err.message.includes('reference')) {
          errorMessage = 'Erreur de référence dans les données. Veuillez vérifier les co-organisateurs.';
        } else if (err.message.includes('validation') || err.message.includes('constraint')) {
          errorMessage = `Erreur de validation: ${err.message}`;
        } else {
          errorMessage = `Erreur: ${err.message}`;
        }
      }

      toast({
        title: 'Erreur lors de la création',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (open) {
      form.reset();
      setCurrentStepIndex(0);
      setValidationError('');
    }
  }, [open, form]);

  useEffect(() => {
    if (!watchedFamilyId) return;

    form.reset({
      workshop_family_id: watchedFamilyId,
      language_code: 'fr',
      workshop_type_id: '',
      title: '',
      description: '',
      classification_status: '',
      start_at: new Date(),
      start_time: '',
      extra_duration_minutes: 0,
      audience_number: 12,
      is_remote: false,
      visio_link: undefined,
      mural_link: undefined,
      location: undefined,
      enablePostWorkshopEmails: true,
    });
    setCurrentStepIndex(0);
    setValidationError('');
  }, [watchedFamilyId]);

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl h-[75vh] max-h-[75vh] overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>
            {isPastWorkshop ? 'Déclarer un atelier passé' : 'Planifier un nouvel atelier'}
          </DialogTitle>
        </DialogHeader>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-1 scroll-pb-8">
          <div className="space-y-4">
            <GradientProgress
              currentStep={currentStepIndex}
              totalSteps={WIZARD_STEPS.length}
              stepLabel={currentStep.label}
            />

            <div className="py-4">
              {currentStep.id === 'workshop-family' && (
                <WorkshopFamilyStep
                  form={form}
                  user={profile}
                  validationError={validationError}
                  families={families}
                />
              )}
              {currentStep.id === 'event-type-language' && (
                <EventTypeLanguageStep
                  form={form}
                  user={profile}
                  validationError={validationError}
                  families={families}
                  workshopTypes={types}
                />
              )}
              {currentStep.id === 'classification-coorg' && (
                <ClassificationCoOrgStep
                  form={form}
                  workshopTypes={types}
                  validationError={validationError}
                  onScrollToBottom={scrollToBottom}
                />
              )}
              {currentStep.id === 'details' && (
                <DetailsStep form={form} validationError={validationError} />
              )}
              {currentStep.id === 'schedule' && (
                <ScheduleStep form={form} isPastWorkshop={isPastWorkshop} validationError={validationError} />
              )}
              {currentStep.id === 'location' && (
                <LocationStep form={form} validationError={validationError} />
              )}
              {currentStep.id === 'review' && (
                <ReviewStep
                  form={form}
                  currentUser={profile}
                  families={families}
                  workshopTypes={types}
                  onEditStep={handleEditStep}
                  isPastWorkshop={isPastWorkshop}
                  workshopImagePath={workshopImagePath}
                  onWorkshopImageChange={setWorkshopImagePath}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>

          {currentStepIndex < WIZARD_STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isPastWorkshop ? 'Déclarer l\'atelier' : 'Créer l\'atelier'}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
