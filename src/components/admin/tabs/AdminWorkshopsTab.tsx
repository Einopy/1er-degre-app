import { useState, useMemo, useEffect, useRef } from 'react';
import { useAdminWorkshops } from '@/hooks/use-admin-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectItem } from '@/components/ui/select';
import { SelectWithClear } from '@/components/ui/select-with-clear';
import { Search } from 'lucide-react';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { EmptyState } from '@/components/admin/EmptyState';
import { MediumWorkshopCard } from '@/components/admin/MediumWorkshopCard';
import type { AdminWorkshopFilters } from '@/services/admin-data';

export function AdminWorkshopsTab() {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  const filters: AdminWorkshopFilters = useMemo(() => {
    const f: AdminWorkshopFilters = {};
    if (lifecycleFilter !== 'all') {
      f.lifecycleStatus = [lifecycleFilter];
    }
    if (familyFilter !== 'all') {
      f.workshopFamily = [familyFilter as 'FDFP' | 'HD'];
    }
    if (typeFilter !== 'all') {
      f.workshopType = typeFilter;
    }
    if (debouncedSearch) {
      f.search = debouncedSearch;
    }
    return f;
  }, [lifecycleFilter, familyFilter, typeFilter, debouncedSearch]);

  const { workshops, loading, error } = useAdminWorkshops(filters);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gestion des ateliers</h2>
        <p className="text-muted-foreground">
          Tous les ateliers de la plateforme ({workshops.length})
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des ateliers</CardTitle>
          <CardDescription>
            Rechercher, filtrer et gérer tous les ateliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <SelectWithClear
                value={familyFilter}
                onValueChange={setFamilyFilter}
                defaultLabel="Famille"
                className="w-[106px] flex-shrink-0"
              >
                <SelectItem value="all">Famille</SelectItem>
                <SelectItem value="FDFP">FDFP</SelectItem>
                <SelectItem value="HD">HD</SelectItem>
              </SelectWithClear>
              <SelectWithClear
                value={typeFilter}
                onValueChange={setTypeFilter}
                defaultLabel="Type"
                className="w-[190px] flex-shrink-0"
              >
                <SelectItem value="all">Type</SelectItem>
                <SelectItem value="workshop">Atelier</SelectItem>
                <SelectItem value="formation">Formation</SelectItem>
                <SelectItem value="formation_pro_1">Formation Pro 1</SelectItem>
                <SelectItem value="formation_pro_2">Formation Pro 2</SelectItem>
                <SelectItem value="formation_formateur">Formation Formateur</SelectItem>
                <SelectItem value="formation_retex">Formation Retex</SelectItem>
              </SelectWithClear>
              <SelectWithClear
                value={lifecycleFilter}
                onValueChange={setLifecycleFilter}
                defaultLabel="Statut"
                className="w-[106px] flex-shrink-0"
              >
                <SelectItem value="all">Statut</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="closed">Clôturé</SelectItem>
                <SelectItem value="canceled">Annulé</SelectItem>
              </SelectWithClear>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="text-center py-12 text-red-600">{error}</div>
            ) : workshops.length === 0 ? (
              <EmptyState message="Aucun atelier trouvé" />
            ) : (
              <div className="space-y-3">
                {workshops.map((workshop) => (
                  <MediumWorkshopCard
                    key={workshop.id}
                    workshop={workshop}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
