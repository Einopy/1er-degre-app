import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { getAvailableLanguages } from '@/services/workshops';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

export interface FilterBarState {
  city: string;
  language: string;
  isRemote: boolean | 'all';
  startDate?: Date;
  endDate?: Date;
  partySize: number | undefined;
}

interface FilterBarProps {
  filters: FilterBarState;
  onFiltersChange: (filters: FilterBarState) => void;
}

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [languages, setLanguages] = useState<string[]>([]);

  useEffect(() => {
    getAvailableLanguages().then(setLanguages);
  }, []);

  const handleClearFilters = () => {
    onFiltersChange({
      city: '',
      language: '',
      isRemote: 'all',
      startDate: undefined,
      endDate: undefined,
      partySize: undefined,
    });
  };

  const hasActiveFilters =
    filters.city ||
    filters.language ||
    filters.isRemote !== 'all' ||
    filters.startDate ||
    filters.endDate ||
    filters.partySize;

  return (
    <div className="bg-card border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Filtres</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-2"
          >
            <X className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="space-y-2">
          <Label>Dates</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.startDate && !filters.endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.startDate && filters.endDate ? (
                  <>
                    {format(filters.startDate, 'dd MMM', { locale: fr })} -{' '}
                    {format(filters.endDate, 'dd MMM yyyy', { locale: fr })}
                  </>
                ) : filters.startDate ? (
                  format(filters.startDate, 'dd MMM yyyy', { locale: fr })
                ) : (
                  <span>Choisir une période</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{
                  from: filters.startDate,
                  to: filters.endDate,
                }}
                onSelect={(range: DateRange | undefined) => {
                  onFiltersChange({
                    ...filters,
                    startDate: range?.from,
                    endDate: range?.to,
                  });
                }}
                initialFocus
                numberOfMonths={2}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input
            id="city"
            placeholder="Ex: Lyon, Paris..."
            value={filters.city}
            onChange={(e) =>
              onFiltersChange({ ...filters, city: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Langue</Label>
          <Select
            value={filters.language || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, language: value === 'all' ? '' : value })
            }
          >
            <SelectTrigger id="language">
              <SelectValue placeholder="Toutes les langues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les langues</SelectItem>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="party-size">Nombre de places</Label>
          <Input
            id="party-size"
            type="number"
            min="1"
            placeholder="Ex: 1, 2, 3..."
            value={filters.partySize ?? ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : undefined;
              onFiltersChange({ ...filters, partySize: value });
            }}
          />
        </div>

        <div className="space-y-2 lg:col-span-4">
          <Label>Format</Label>
          <RadioGroup
            value={
              filters.isRemote === 'all'
                ? 'all'
                : filters.isRemote
                ? 'remote'
                : 'in-person'
            }
            onValueChange={(value) => {
              const isRemote =
                value === 'all' ? 'all' : value === 'remote' ? true : false;
              onFiltersChange({ ...filters, isRemote });
            }}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="font-normal cursor-pointer">
                Tous
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="in-person" id="in-person" />
              <Label
                htmlFor="in-person"
                className="font-normal cursor-pointer"
              >
                Présentiel
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="remote" id="remote" />
              <Label htmlFor="remote" className="font-normal cursor-pointer">
                À distance
              </Label>
            </div>
          </RadioGroup>
        </div>

      </div>
    </div>
  );
}
