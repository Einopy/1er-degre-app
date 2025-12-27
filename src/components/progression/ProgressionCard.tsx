import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, Lock, CheckCircle, Clock } from 'lucide-react';
import { useState } from 'react';
import { RequirementProgress } from './RequirementProgress';
import type { RoleLevelProgress } from '@/services/user-progression';
import type { WorkshopType } from '@/lib/database.types';

interface ProgressionCardProps {
  levelProgress: RoleLevelProgress;
  workshopTypes: WorkshopType[];
}

const LEVEL_COLORS = {
  1: 'bg-blue-500',
  2: 'bg-green-500',
  3: 'bg-purple-500',
  4: 'bg-orange-500',
};

const LEVEL_BORDER_COLORS = {
  1: 'border-blue-500',
  2: 'border-green-500',
  3: 'border-purple-500',
  4: 'border-orange-500',
};

export function ProgressionCard({ levelProgress, workshopTypes }: ProgressionCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { roleLevel, status, progress, requirements } = levelProgress;

  const levelColor = LEVEL_COLORS[roleLevel.level as keyof typeof LEVEL_COLORS] || 'bg-gray-500';
  const borderColor = LEVEL_BORDER_COLORS[roleLevel.level as keyof typeof LEVEL_BORDER_COLORS] || 'border-gray-500';

  const getStatusIcon = () => {
    switch (status) {
      case 'achieved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'locked':
        return <Lock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'achieved':
        return 'Validé';
      case 'in_progress':
        return 'En cours';
      case 'locked':
        return 'Non débloqué';
    }
  };

  const getStatusBadgeVariant = () => {
    switch (status) {
      case 'achieved':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'locked':
        return 'outline';
    }
  };

  // Get formation labels
  const getFormationLabel = (typeId: string): string => {
    const type = workshopTypes.find(t => t.id === typeId);
    return type?.label || 'Formation inconnue';
  };

  return (
    <Card className={`border-l-4 ${borderColor} ${status === 'achieved' ? 'bg-green-50/30' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`${levelColor} text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0`}>
              {roleLevel.level}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-lg">{roleLevel.label}</CardTitle>
                {getStatusIcon()}
              </div>
              {roleLevel.description && (
                <CardDescription className="text-sm">{roleLevel.description}</CardDescription>
              )}
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant()} className="ml-2">
            {getStatusLabel()}
          </Badge>
        </div>
      </CardHeader>

      {requirements && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="px-6 pb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                <span className="text-sm font-medium">
                  {isOpen ? 'Masquer les prérequis' : 'Voir les prérequis détaillés'}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Formations Required */}
              {progress.formations.requiredCount > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">Formations requises</h4>
                  <div className="space-y-1.5">
                    {progress.formations.required.map((typeId) => {
                      const isCompleted = progress.formations.completed.includes(typeId);
                      return (
                        <div key={typeId} className="flex items-center gap-2 text-sm">
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground shrink-0" />
                          )}
                          <span className={isCompleted ? 'text-green-700' : ''}>
                            {getFormationLabel(typeId)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Workshops Total */}
              {progress.workshopsTotal.required > 0 && (
                <RequirementProgress
                  label="Ateliers animés (total)"
                  current={progress.workshopsTotal.current}
                  required={progress.workshopsTotal.required}
                  unit="ateliers"
                />
              )}

              {/* Workshops Online */}
              {progress.workshopsOnline.required > 0 && (
                <RequirementProgress
                  label="Ateliers en distanciel"
                  current={progress.workshopsOnline.current}
                  required={progress.workshopsOnline.required}
                  unit="ateliers"
                  icon="online"
                />
              )}

              {/* Workshops In-Person */}
              {progress.workshopsInPerson.required > 0 && (
                <RequirementProgress
                  label="Ateliers en présentiel"
                  current={progress.workshopsInPerson.current}
                  required={progress.workshopsInPerson.required}
                  unit="ateliers"
                  icon="in-person"
                />
              )}

              {/* Feedback Count */}
              {progress.feedback.requiredCount > 0 && (
                <RequirementProgress
                  label="Retours positifs"
                  current={progress.feedback.count}
                  required={progress.feedback.requiredCount}
                  unit="retours"
                />
              )}

              {/* Feedback Average */}
              {progress.feedback.requiredAverage > 0 && (
                <RequirementProgress
                  label="Note moyenne"
                  current={progress.feedback.average}
                  required={progress.feedback.requiredAverage}
                  unit="/ 5"
                  type="rating"
                />
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
}
