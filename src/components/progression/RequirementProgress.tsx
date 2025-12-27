import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Star, Monitor, Home } from 'lucide-react';

interface RequirementProgressProps {
  label: string;
  current: number;
  required: number;
  unit?: string;
  type?: 'count' | 'rating';
  icon?: 'online' | 'in-person' | 'default';
}

export function RequirementProgress({
  label,
  current,
  required,
  unit = '',
  type = 'count',
  icon = 'default',
}: RequirementProgressProps) {
  const isComplete = current >= required;
  const percentage = required > 0 ? Math.min((current / required) * 100, 100) : 0;

  const IconComponent = icon === 'online' ? Monitor : icon === 'in-person' ? Home : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
          {type === 'rating' && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${isComplete ? 'text-green-600' : 'text-muted-foreground'}`}>
            {type === 'rating' ? current.toFixed(1) : current} / {type === 'rating' ? required.toFixed(1) : required} {unit}
          </span>
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      <Progress value={percentage} className={isComplete ? 'bg-green-100' : ''} />
    </div>
  );
}
