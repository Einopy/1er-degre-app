import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import type { QuestCardData } from '@/hooks/use-journey-data';
import type { LevelTheme } from './QuestCard';

interface QuestCardLockedProps {
  questCard: QuestCardData;
  theme: LevelTheme;
}

export function QuestCardLocked({ questCard }: QuestCardLockedProps) {
  const { roleLevel } = questCard;

  return (
    <Card className="border-l-4 border-gray-300 bg-gray-50/50 opacity-60 transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            {/* Icône niveau verrouillé */}
            <div className="relative">
              <div className="bg-gray-300 text-gray-500 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                {roleLevel.level}
              </div>
              <div className="absolute -top-1 -right-1 bg-gray-200 rounded-full p-1">
                <Lock className="h-3 w-3 text-gray-500" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <CardTitle className="text-lg text-gray-500">
                  {roleLevel.label}
                </CardTitle>
                <Badge variant="outline" className="text-gray-400 border-gray-300">
                  <Lock className="h-3 w-3 mr-1" />
                  Verrouillé
                </Badge>
              </div>
              
              {roleLevel.description && (
                <CardDescription className="text-gray-400">
                  {roleLevel.description}
                </CardDescription>
              )}

              <p className="text-xs text-gray-400 mt-2">
                Complétez les niveaux précédents pour débloquer cette certification
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
