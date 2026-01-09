import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { QuestCardData } from '@/hooks/use-journey-data';
import type { LevelTheme } from './QuestCard';

interface QuestCardObtainedProps {
  questCard: QuestCardData;
  theme: LevelTheme;
}

export function QuestCardObtained({ questCard, theme }: QuestCardObtainedProps) {
  const { roleLevel, obtainedAt } = questCard;

  return (
    <Card className={`border-l-4 ${theme.border} bg-gradient-to-br ${theme.gradient} transition-all duration-300 hover:shadow-md`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {/* Icône niveau avec badge award */}
            <div className="relative">
              <div className={`${theme.icon} text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-md`}>
                {roleLevel.level}
              </div>
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                <Award className={`h-4 w-4 ${theme.iconText}`} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CardTitle className={`text-lg ${theme.text}`}>
                  {roleLevel.label}
                </CardTitle>
                <Badge variant="secondary" className={`${theme.badge} font-medium`}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Obtenu
                </Badge>
              </div>
              
              {roleLevel.description && (
                <CardDescription className={theme.textLight}>
                  {roleLevel.description}
                </CardDescription>
              )}

              {obtainedAt && (
                <p className="text-xs text-muted-foreground mt-2">
                  Certification obtenue le {format(new Date(obtainedAt), 'dd MMMM yyyy', { locale: fr })}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
