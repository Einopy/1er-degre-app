import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Target, 
  ChevronDown, 
  CheckCircle, 
  Circle, 
  GraduationCap, 
  Users, 
  Monitor, 
  MapPin,
  Star,
  MessageSquare,
  ArrowRight,
  CalendarX,
  Mail,
} from 'lucide-react';
import type { QuestCardData } from '@/hooks/use-journey-data';
import type { LevelTheme } from './QuestCard';
import { useActiveClient } from '@/hooks/use-active-client';
import { useWorkshopTypes } from '@/hooks/use-client-config';

interface QuestCardNextProps {
  questCard: QuestCardData;
  theme: LevelTheme;
  familyCode: string;
}

export function QuestCardNext({ questCard, theme, familyCode }: QuestCardNextProps) {
  const navigate = useNavigate();
  const { activeClient } = useActiveClient();
  const { types: workshopTypes } = useWorkshopTypes(activeClient?.id);
  const [isOpen, setIsOpen] = useState(true);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const { roleLevel, requirements, progress, availableWorkshops } = questCard;

  // Animation de la barre de progression
  useEffect(() => {
    if (progress) {
      const totalRequired = getTotalRequirements();
      const totalCompleted = getTotalCompleted();
      const percentage = totalRequired > 0 ? (totalCompleted / totalRequired) * 100 : 0;
      
      const timer = setTimeout(() => {
        setAnimatedProgress(percentage);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  const getTotalRequirements = () => {
    if (!progress) return 0;
    let total = 0;
    if (progress.formations.requiredCount > 0) total += progress.formations.requiredCount;
    if (progress.workshopsTotal.required > 0) total += 1;
    if (progress.workshopsOnline.required > 0) total += 1;
    if (progress.workshopsInPerson.required > 0) total += 1;
    if (progress.feedback.requiredCount > 0) total += 1;
    if (progress.feedback.requiredAverage > 0) total += 1;
    return total;
  };

  const getTotalCompleted = () => {
    if (!progress) return 0;
    let completed = 0;
    completed += progress.formations.completedCount;
    if (progress.workshopsTotal.required > 0 && progress.workshopsTotal.current >= progress.workshopsTotal.required) completed += 1;
    if (progress.workshopsOnline.required > 0 && progress.workshopsOnline.current >= progress.workshopsOnline.required) completed += 1;
    if (progress.workshopsInPerson.required > 0 && progress.workshopsInPerson.current >= progress.workshopsInPerson.required) completed += 1;
    if (progress.feedback.requiredCount > 0 && progress.feedback.count >= progress.feedback.requiredCount) completed += 1;
    if (progress.feedback.requiredAverage > 0 && progress.feedback.average >= progress.feedback.requiredAverage) completed += 1;
    return completed;
  };

  const getFormationLabel = (typeId: string): string => {
    const type = workshopTypes.find(t => t.id === typeId);
    return type?.label || 'Formation';
  };

  const handleStartFormation = () => {
    // Rediriger vers la liste des ateliers avec filtres verrouillés
    navigate(`/?family=${familyCode}&type=formation&locked=true`);
  };

  const handleContactTeam = () => {
    navigate('/support');
  };

  const hasRequirements = requirements && (
    progress?.formations.requiredCount ||
    progress?.workshopsTotal.required ||
    progress?.workshopsOnline.required ||
    progress?.workshopsInPerson.required ||
    progress?.feedback.requiredCount ||
    progress?.feedback.requiredAverage
  );

  return (
    <Card className={`border-l-4 ${theme.border} bg-gradient-to-br ${theme.gradient} shadow-lg transition-all duration-300 hover:shadow-xl`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {/* Icône niveau avec pulse */}
            <div className="relative">
              <div className={`${theme.icon} text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-md animate-pulse`}>
                {roleLevel.level}
              </div>
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <Target className={`h-4 w-4 ${theme.iconText}`} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={`${theme.badge} font-medium`}>
                  Prochaine certification
                </Badge>
              </div>
              <CardTitle className={`text-xl ${theme.text}`}>
                {roleLevel.label}
              </CardTitle>
              
              {roleLevel.description && (
                <CardDescription className={`${theme.textLight} mt-1`}>
                  {roleLevel.description}
                </CardDescription>
              )}
            </div>
          </div>
        </div>

        {/* Barre de progression globale */}
        {hasRequirements && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={`font-medium ${theme.text}`}>Progression</span>
              <span className="text-muted-foreground">
                {getTotalCompleted()}/{getTotalRequirements()} prérequis
              </span>
            </div>
            <div className="h-2 bg-white/50 rounded-full overflow-hidden">
              <div 
                className={`h-full ${theme.icon} rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${animatedProgress}%` }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-2">
        {/* Prérequis détaillés (dépliable) */}
        {hasRequirements && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className={`w-full justify-between p-2 h-auto ${theme.textLight} hover:${theme.bg}`}
              >
                <span className="text-sm font-medium">
                  {isOpen ? 'Masquer les prérequis' : 'Voir les prérequis détaillés'}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="overflow-hidden transition-all duration-300 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="space-y-4 pt-3">
                <TooltipProvider>
                  {/* Formations requises */}
                  {progress && progress.formations.requiredCount > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Formations requises
                      </h4>
                      <div className="space-y-1.5 pl-6">
                        {progress.formations.required.map((typeId) => {
                          const isCompleted = progress.formations.completed.includes(typeId);
                          return (
                            <Tooltip key={typeId}>
                              <TooltipTrigger asChild>
                                <div className={`flex items-center gap-2 text-sm cursor-help transition-colors ${isCompleted ? theme.text : 'text-muted-foreground'}`}>
                                  {isCompleted ? (
                                    <CheckCircle className={`h-4 w-4 ${theme.iconText} shrink-0`} />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                  <span className={isCompleted ? 'font-medium' : ''}>
                                    {getFormationLabel(typeId)}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              {isCompleted && (
                                <TooltipContent>
                                  <p>Formation complétée</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ateliers animés */}
                  {progress && progress.workshopsTotal.required > 0 && (
                    <RequirementProgressItem
                      icon={<Users className="h-4 w-4" />}
                      label="Ateliers animés (total)"
                      current={progress.workshopsTotal.current}
                      required={progress.workshopsTotal.required}
                      theme={theme}
                    />
                  )}

                  {/* Ateliers en ligne */}
                  {progress && progress.workshopsOnline.required > 0 && (
                    <RequirementProgressItem
                      icon={<Monitor className="h-4 w-4" />}
                      label="Ateliers en distanciel"
                      current={progress.workshopsOnline.current}
                      required={progress.workshopsOnline.required}
                      theme={theme}
                    />
                  )}

                  {/* Ateliers en présentiel */}
                  {progress && progress.workshopsInPerson.required > 0 && (
                    <RequirementProgressItem
                      icon={<MapPin className="h-4 w-4" />}
                      label="Ateliers en présentiel"
                      current={progress.workshopsInPerson.current}
                      required={progress.workshopsInPerson.required}
                      theme={theme}
                    />
                  )}

                  {/* Retours positifs */}
                  {progress && progress.feedback.requiredCount > 0 && (
                    <RequirementProgressItem
                      icon={<MessageSquare className="h-4 w-4" />}
                      label="Retours positifs"
                      current={progress.feedback.count}
                      required={progress.feedback.requiredCount}
                      theme={theme}
                    />
                  )}

                  {/* Note moyenne */}
                  {progress && progress.feedback.requiredAverage > 0 && (
                    <RequirementProgressItem
                      icon={<Star className="h-4 w-4" />}
                      label="Note moyenne"
                      current={progress.feedback.average}
                      required={progress.feedback.requiredAverage}
                      theme={theme}
                      isRating
                    />
                  )}
                </TooltipProvider>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* CTA - Commencer la formation */}
        <div className="mt-6">
          {availableWorkshops && availableWorkshops.length > 0 ? (
            <Button 
              size="lg" 
              className={`w-full ${theme.icon} hover:opacity-90 transition-all duration-300`}
              onClick={handleStartFormation}
            >
              <GraduationCap className="h-5 w-5 mr-2" />
              {availableWorkshops.length === 1 
                ? 'Voir la formation disponible'
                : `Voir les ${availableWorkshops.length} formations disponibles`
              }
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div className="text-center py-4 space-y-3">
              <CalendarX className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Aucune formation disponible pour le moment
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleContactTeam}
                className={`${theme.borderLight} ${theme.text} hover:${theme.bg}`}
              >
                <Mail className="h-4 w-4 mr-2" />
                Contacter l'équipe
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Sous-composant pour les items de progression
interface RequirementProgressItemProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  required: number;
  theme: LevelTheme;
  isRating?: boolean;
}

function RequirementProgressItem({ 
  icon, 
  label, 
  current, 
  required, 
  theme,
  isRating = false,
}: RequirementProgressItemProps) {
  const isComplete = current >= required;
  const percentage = Math.min((current / required) * 100, 100);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className={`flex items-center gap-2 ${isComplete ? theme.text : 'text-muted-foreground'}`}>
          {isComplete ? (
            <CheckCircle className={`h-4 w-4 ${theme.iconText}`} />
          ) : (
            icon
          )}
          {label}
        </span>
        <Badge 
          variant={isComplete ? 'default' : 'secondary'}
          className={isComplete ? theme.badge : ''}
        >
          {isRating 
            ? `${current.toFixed(1)}/${required}` 
            : `${current}/${required}`
          }
        </Badge>
      </div>
      <Progress 
        value={percentage} 
        className={`h-1.5 ${isComplete ? '' : 'bg-muted/50'}`}
      />
    </div>
  );
}
