import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface WorkshopFamilyButtonsProps {
  selectedFamilies: ('FDFP' | 'HD')[];
  onFamilyToggle: (family: 'FDFP' | 'HD') => void;
}

export function WorkshopFamilyButtons({
  selectedFamilies,
  onFamilyToggle,
}: WorkshopFamilyButtonsProps) {
  const isFDFPSelected = selectedFamilies.includes('FDFP');
  const isHDSelected = selectedFamilies.includes('HD');

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <Button
        size="lg"
        variant={isFDFPSelected ? 'default' : 'outline'}
        onClick={() => onFamilyToggle('FDFP')}
        className={cn(
          'flex-1 h-auto py-6 px-8 text-lg font-semibold transition-all relative',
          isFDFPSelected && 'shadow-md'
        )}
      >
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-2">
            <span className="text-2xl">FDFP</span>
            <Badge
              variant="outline"
              className="px-2 py-0.5 text-xs border-green-500 bg-green-50 text-green-700"
              aria-label="Ateliers disponibles"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" aria-hidden="true" />
              Actif
            </Badge>
          </div>
          <span className="text-xs font-normal opacity-90">
            Formation du Faire ensemble
          </span>
        </div>
      </Button>

      <Button
        size="lg"
        variant={isHDSelected ? 'default' : 'outline'}
        onClick={() => onFamilyToggle('HD')}
        className={cn(
          'flex-1 h-auto py-6 px-8 text-lg font-semibold transition-all relative',
          isHDSelected && 'shadow-md'
        )}
      >
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-2">
            <span className="text-2xl">HD</span>
            <Badge
              variant="outline"
              className="px-2 py-0.5 text-xs border-green-500 bg-green-50 text-green-700"
              aria-label="Ateliers disponibles"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" aria-hidden="true" />
              Actif
            </Badge>
          </div>
          <span className="text-xs font-normal opacity-90">
            Heure Déclic
          </span>
        </div>
      </Button>
    </div>
  );
}
