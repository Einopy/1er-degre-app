import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandableRecentCardProps {
  title: string;
  items: React.ReactNode[];
  maxCollapsed?: number;
  maxExpanded?: number;
  emptyMessage?: string;
}

export function ExpandableRecentCard({
  title,
  items,
  maxCollapsed = 3,
  maxExpanded = 10,
  emptyMessage = 'Aucune donnée disponible',
}: ExpandableRecentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayedItems = isExpanded
    ? items.slice(0, maxExpanded)
    : items.slice(0, maxCollapsed);

  const hasMore = items.length > maxCollapsed;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-2">
            {displayedItems}
            {isExpanded && items.length > maxExpanded && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Affichage de {maxExpanded} sur {items.length} éléments
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
