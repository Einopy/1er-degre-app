import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { getWorkshopFamilyColor, getWorkshopFamilyBgColor } from '@/lib/badge-utils';
import { cn } from '@/lib/utils';

interface WorkshopFamilyBadgeProps {
  family: string;
  className?: string;
}

export const WorkshopFamilyBadge = memo(function WorkshopFamilyBadge({ family, className }: WorkshopFamilyBadgeProps) {
  const color = getWorkshopFamilyColor(family);
  const bgColor = getWorkshopFamilyBgColor(family);

  return (
    <Badge
      variant="outline"
      className={cn('min-w-[3.5rem] justify-center', className)}
      style={{
        borderColor: color,
        backgroundColor: bgColor,
        color: color,
      }}
    >
      {family}
    </Badge>
  );
});
