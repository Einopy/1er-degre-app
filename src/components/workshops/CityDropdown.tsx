import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvailableCities } from '@/services/workshops';
import { detectUserLocation } from '@/services/geolocation';

interface CityDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function CityDropdown({ value, onValueChange, className }: CityDropdownProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const availableCities = await getAvailableCities();
        setCities(availableCities);

        const location = await detectUserLocation();
        if (location && location.city) {
          const cityMatch = availableCities.find(
            (city) => city.toLowerCase() === location.city.toLowerCase()
          );
          if (cityMatch && !value) {
            setDetectedCity(cityMatch);
            onValueChange(cityMatch);
          }
        }
      } catch (error) {
        console.error('Error loading cities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCities();
  }, []);

  const displayValue = value || 'Choisir une ville';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between font-medium bg-background hover:bg-muted/50',
            className
          )}
        >
          <div className="flex items-center gap-2">
            <span className="fi fi-fr w-5 h-4 rounded-sm" />
            <span className="uppercase tracking-wide text-sm">{displayValue}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Rechercher une ville..." className="h-9" />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Chargement...' : 'Aucune ville trouvée'}
            </CommandEmpty>
            <CommandGroup heading="FRANCE">
              {cities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? '' : currentValue);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <span className="flex-1">{city}</span>
                  {value === city && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  {detectedCity === city && !value && (
                    <span className="text-xs text-muted-foreground ml-2">(détectée)</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
