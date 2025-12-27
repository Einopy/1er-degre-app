import { cn } from '@/lib/utils';

interface WorkshopFamilyFilterProps {
  availableFamilies: ('FDFP' | 'HD')[];
  selectedFamilies: ('FDFP' | 'HD')[];
  onChange: (families: ('FDFP' | 'HD')[]) => void;
}

export function WorkshopFamilyFilter({
  availableFamilies,
  selectedFamilies,
  onChange,
}: WorkshopFamilyFilterProps) {
  if (availableFamilies.length <= 1) {
    return null;
  }

  const isAllSelected = selectedFamilies.length === availableFamilies.length;

  const handleSelect = (family: 'FDFP' | 'HD' | 'all') => {
    if (family === 'all') {
      onChange(availableFamilies);
    } else {
      onChange([family]);
    }
  };

  const isSelected = (family: 'FDFP' | 'HD' | 'all') => {
    if (family === 'all') return isAllSelected;
    return selectedFamilies.length === 1 && selectedFamilies.includes(family);
  };

  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-1 gap-1">
      <button
        onClick={() => handleSelect('all')}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
          isSelected('all')
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
        )}
      >
        Tous
      </button>
      {availableFamilies.map((family) => (
        <button
          key={family}
          onClick={() => handleSelect(family)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
            isSelected(family)
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          )}
        >
          {family}
        </button>
      ))}
    </div>
  );
}
