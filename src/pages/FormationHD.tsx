import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  GraduationCap,
  Calendar,
  MapPin,
  Monitor,
  Loader2,
  Lock,
  CheckCircle,
  AlertCircle,
  Award,
  ArrowDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Workshop } from '@/lib/database.types';
import {
  fetchEligibleTrainingWorkshops,
  getAnimatedWorkshopStats,
  getUserAttendedTrainings,
  checkProEligibility,
  type TrainingType,
} from '@/services/training-progression';
import { canManageWorkshop } from '@/lib/organizer-utils';

const TRAINING_LABELS: Record<string, string> = {
  formation: 'Formation',
  formation_retex: 'Formation Retex',
  formation_pro_1: 'Formation Pro 1',
  formation_pro_2: 'Formation Pro 2',
  formation_formateur: 'Formation Formateur',
};

export function FormationHD() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const availableTrainingsRef = useRef<HTMLDivElement>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [attendedTrainings, setAttendedTrainings] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<any>(null);
  const [proEligibility, setProEligibility] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadTrainings();
    }
  }, [profile?.id]);

  const loadTrainings = async () => {
    if (!profile?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const [workshopsData, attended, statsData, eligibility] = await Promise.all([
        fetchEligibleTrainingWorkshops(profile.id, 'HD'),
        getUserAttendedTrainings(profile.id, 'HD'),
        getAnimatedWorkshopStats(profile.id, 'HD'),
        checkProEligibility(profile.id, 'HD'),
      ]);

      setWorkshops(workshopsData);
      setAttendedTrainings(attended);
      setStats(statsData);
      setProEligibility(eligibility);
    } catch (err: any) {
      setError('Erreur lors du chargement des formations');
      console.error('Error loading trainings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToAvailableTrainings = () => {
    if (availableTrainingsRef.current) {
      availableTrainingsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        const heading = availableTrainingsRef.current?.querySelector('h2');
        if (heading) {
          heading.focus();
        }
      }, 500);
    }
  };

  const hasPublicCertification = profile?.roles?.includes('HD_public') || attendedTrainings.has('formation');
  const hasProCertification = profile?.roles?.includes('HD_pro') || false;
  const hasTrainerCertification = profile?.roles?.includes('HD_trainer') || false;
  const hasInstructorCertification = profile?.roles?.includes('HD_instructor') || false;

  const getProgressPercentage = () => {
    if (!stats) return 0;
    const total = 4;
    let completed = 0;
    if (attendedTrainings.has('formation')) completed++;
    if (attendedTrainings.has('formation_retex')) completed++;
    if (stats.totalClosed >= 3 && stats.closedPresentiel >= 1 && stats.closedDistanciel >= 1 && stats.positiveFeedbackCount >= 6) completed++;
    if (hasProCertification) completed++;
    return (completed / total) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Formation HD</h1>
        <p className="text-muted-foreground mt-2">
          Votre parcours de formation et certifications HD
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Vos certifications HD
          </CardTitle>
          <CardDescription>Collectionnez vos blasons et progressez dans votre parcours</CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider>
            <div className="flex flex-wrap items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`relative px-6 py-4 rounded-lg border-2 transition-all cursor-help ${
                      hasPublicCertification
                        ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-400 shadow-md hover:shadow-lg'
                        : 'bg-muted/30 border-muted-foreground/20 opacity-60'
                    }`}
                  >
                    {hasPublicCertification && (
                      <div className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full p-1.5">
                        <Award className="h-4 w-4" />
                      </div>
                    )}
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-bold text-green-700">🎯</div>
                      <div className="font-bold text-sm text-green-900">Animateur</div>
                      <div className="text-xs text-green-700 font-medium">HD</div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Animateur HD</p>
                  <p className="text-sm">
                    Obtenue en complétant la formation HD initiale. Permet d'animer des ateliers
                    grand public.
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`relative px-6 py-4 rounded-lg border-2 transition-all cursor-help ${
                      hasProCertification
                        ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-400 shadow-md hover:shadow-lg'
                        : 'bg-muted/30 border-muted-foreground/20 opacity-60'
                    }`}
                  >
                    {hasProCertification && (
                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1.5">
                        <Award className="h-4 w-4" />
                      </div>
                    )}
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-bold text-blue-700">⭐</div>
                      <div className="font-bold text-sm text-blue-900">Animateur Pro</div>
                      <div className="text-xs text-blue-700 font-medium">HD</div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Animateur Pro HD</p>
                  <p className="text-sm">
                    Obtenue après avoir complété Formation Pro 2. Nécessite 3 ateliers animés
                    (présentiel + distanciel) et 6 retours positifs.
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`relative px-6 py-4 rounded-lg border-2 transition-all cursor-help ${
                      hasTrainerCertification
                        ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-400 shadow-md hover:shadow-lg'
                        : 'bg-muted/30 border-muted-foreground/20 opacity-60'
                    }`}
                  >
                    {hasTrainerCertification && (
                      <div className="absolute -top-2 -right-2 bg-amber-600 text-white rounded-full p-1.5">
                        <Award className="h-4 w-4" />
                      </div>
                    )}
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-bold text-amber-700">🏆</div>
                      <div className="font-bold text-sm text-amber-900">Formateur</div>
                      <div className="text-xs text-amber-700 font-medium">HD</div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Formateur HD</p>
                  <p className="text-sm">
                    Obtenue en complétant Formation Formateur. Permet de former les futurs
                    animateurs HD.
                  </p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`relative px-6 py-4 rounded-lg border-2 transition-all cursor-help ${
                      hasInstructorCertification
                        ? 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-400 shadow-md hover:shadow-lg'
                        : 'bg-muted/30 border-muted-foreground/20 opacity-60'
                    }`}
                  >
                    {hasInstructorCertification && (
                      <div className="absolute -top-2 -right-2 bg-gray-600 text-white rounded-full p-1.5">
                        <Award className="h-4 w-4" />
                      </div>
                    )}
                    <div className="text-center space-y-1">
                      <div className={`text-2xl font-bold ${hasInstructorCertification ? 'text-gray-700' : 'text-muted-foreground'}`}>🎖️</div>
                      <div className={`font-bold text-sm ${hasInstructorCertification ? 'text-gray-900' : 'text-muted-foreground'}`}>Instructeur</div>
                      <div className={`text-xs font-medium ${hasInstructorCertification ? 'text-gray-700' : 'text-muted-foreground'}`}>HD</div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Instructeur HD</p>
                  <p className="text-sm">
                    Certification avancée pour les instructeurs principaux. Permet de former les
                    formateurs HD.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Vos formations
            </CardTitle>
            <CardDescription>Vos formations complétées et prochaine étape</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            {attendedTrainings.size > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Formations complétées</h4>
                <div className="space-y-2">
                  {Array.from(attendedTrainings).map((training) => (
                    <div key={training} className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-sm font-medium text-green-900">
                        {TRAINING_LABELS[training]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {attendedTrainings.size > 0 && workshops.length > 0 && <Separator />}

            {workshops.length > 0 ? (
              <Button
                className="w-full"
                size="lg"
                onClick={scrollToAvailableTrainings}
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Continuer votre formation
              </Button>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Aucune formation disponible pour le moment. Continuez à animer des ateliers pour
                  débloquer de nouvelles formations!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Votre progression
            </CardTitle>
            <CardDescription>Votre avancement vers HD_Pro</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            {stats && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progression globale</span>
                    <span className="text-muted-foreground">
                      {Math.round(getProgressPercentage())}%
                    </span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-2" />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {attendedTrainings.has('formation') ? (
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted shrink-0" />
                    )}
                    <span
                      className={attendedTrainings.has('formation') ? 'font-medium' : 'text-muted-foreground'}
                    >
                      Formation HD
                    </span>
                    {attendedTrainings.has('formation') && <Badge variant="secondary" className="ml-auto">Complété</Badge>}
                  </div>

                  <div className="flex items-center gap-2">
                    {attendedTrainings.has('formation_retex') ? (
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    ) : attendedTrainings.has('formation') ? (
                      <div className="h-5 w-5 rounded-full border-2 border-primary shrink-0" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={
                        attendedTrainings.has('formation_retex')
                          ? 'font-medium'
                          : attendedTrainings.has('formation')
                          ? ''
                          : 'text-muted-foreground'
                      }
                    >
                      Formation Retex
                    </span>
                    {attendedTrainings.has('formation_retex') && <Badge variant="secondary" className="ml-auto">Complété</Badge>}
                  </div>

                  <Separator />

                  <h4 className="font-semibold text-sm">Prérequis pour HD_Pro:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Ateliers animés</span>
                      <Badge variant={stats.totalClosed >= 3 ? 'default' : 'secondary'}>
                        {stats.totalClosed}/3
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>En présentiel</span>
                      {stats.closedPresentiel >= 1 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>À distance</span>
                      {stats.closedDistanciel >= 1 ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Retours positifs</span>
                      <Badge variant={stats.positiveFeedbackCount >= 6 ? 'default' : 'secondary'}>
                        {stats.positiveFeedbackCount}/6
                      </Badge>
                    </div>
                  </div>

                  {proEligibility && !proEligibility.isEligible && proEligibility.reason && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{proEligibility.reason}</AlertDescription>
                    </Alert>
                  )}

                  {proEligibility && proEligibility.isEligible && !hasProCertification && (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm text-green-900">
                        Vous êtes éligible pour la formation HD_Pro!
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div ref={availableTrainingsRef} className="scroll-mt-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 tabIndex={-1} className="text-2xl font-semibold outline-none">
                Formations disponibles
              </h2>
            </CardTitle>
            <CardDescription>
              Toutes les formations HD actuellement accessibles pour vous
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workshops.length === 0 ? (
              <div className="py-12 text-center">
                <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucune formation disponible pour le moment. Continuez à animer des ateliers pour
                  débloquer de nouvelles formations!
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {workshops.map((workshop) => (
                  <Card key={workshop.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {TRAINING_LABELS[workshop.workshop_type_id as TrainingType]}
                            </Badge>
                            <Badge variant="outline">{workshop.workshop_family_id}</Badge>
                          </div>
                          <CardTitle className="text-xl">{workshop.title}</CardTitle>
                          {workshop.description && (
                            <CardDescription className="line-clamp-2">
                              {workshop.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(workshop.start_at), 'dd MMM yyyy à HH:mm', {
                              locale: fr,
                            })}
                          </span>
                        </div>
                        {workshop.is_remote ? (
                          <div className="flex items-center gap-1.5">
                            <Monitor className="h-4 w-4" />
                            <span>À distance</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            <span>{workshop.location?.city || 'Présentiel'}</span>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <Button
                        className="w-full"
                        onClick={() =>
                          navigate(
                            profile && canManageWorkshop(profile, workshop)
                              ? `/organizer/workshops/${workshop.id}`
                              : `/workshops/${workshop.id}`
                          )
                        }
                      >
                        {profile && canManageWorkshop(profile, workshop) ? 'Gérer' : 'Voir les détails'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
