import * as React from 'react';
import { X } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { CaretSortIcon as RadixCaretSortIcon } from '@radix-ui/react-icons';
import {
  Select,
  SelectContent,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SelectWithClearProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  defaultLabel?: string;
  className?: string;
  children: React.ReactNode;
}

export function SelectWithClear({
  value,
  onValueChange,
  placeholder,
  defaultLabel,
  className,
  children,
}: SelectWithClearProps) {
  const hasSelection = value !== 'all';

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange('all');
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
          className
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasSelection && (
            <button
              onClick={handleClear}
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              className="flex-shrink-0 flex h-4 w-4 items-center justify-center rounded-sm hover:bg-muted transition-colors"
              type="button"
              aria-label="Clear selection"
              tabIndex={-1}
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          <div className="flex-1 min-w-0 text-left">
            <SelectValue placeholder={defaultLabel || placeholder} />
          </div>
        </div>
        {!hasSelection && (
          <SelectPrimitive.Icon asChild>
            <RadixCaretSortIcon className="h-4 w-4 opacity-50 flex-shrink-0" />
          </SelectPrimitive.Icon>
        )}
      </SelectPrimitive.Trigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
