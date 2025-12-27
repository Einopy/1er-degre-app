import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableSectionProps {
  children: React.ReactNode[];
  maxCollapsed?: number;
  maxExpanded?: number;
  emptyMessage?: string;
}

export function ExpandableSection({
  children,
  maxCollapsed = 3,
  maxExpanded = 10,
  emptyMessage = 'Aucune donnée disponible',
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (children.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const displayedItems = isExpanded
    ? children.slice(0, maxExpanded)
    : children.slice(0, maxCollapsed);

  const hasMore = children.length > maxCollapsed;

  return (
    <div className="space-y-2">
      {displayedItems}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Voir moins
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Voir plus ({Math.min(maxExpanded, children.length)} max)
              </>
            )}
          </Button>
        </div>
      )}
      {isExpanded && children.length > maxExpanded && (
        <p className="text-xs text-muted-foreground text-center pt-2">
          Affichage de {maxExpanded} sur {children.length} éléments
        </p>
      )}
    </div>
  );
}
