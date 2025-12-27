import { ReactNode, memo } from 'react';
import { cn } from '@/lib/utils';

interface CompactItemCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const CompactItemCard = memo(function CompactItemCard({ children, className, onClick }: CompactItemCardProps) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={cn(
        'w-full px-4 py-2.5 rounded-lg border bg-card transition-all duration-200',
        isClickable ? 'cursor-pointer hover:shadow-md hover:border-primary/50' : 'hover:bg-muted/30',
        className
      )}
    >
      {children}
    </div>
  );
});
