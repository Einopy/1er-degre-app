import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { WorkshopFamilyButtons } from '@/components/workshops/WorkshopFamilyButtons';
import { FilterBar, type FilterBarState } from '@/components/workshops/FilterBar';
import { CityDropdown } from '@/components/workshops/CityDropdown';
import { WorkshopCard } from '@/components/workshops/WorkshopCard';
import { WaitlistDialog } from '@/components/workshops/WaitlistDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { fetchWorkshops, type WorkshopFilters } from '@/services/workshops';
import type { Workshop } from '@/lib/database.types';
import { AlertCircle, Globe } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';

const PAGE_SIZE = 12;

export function PublicWorkshopsList() {
  const { profile } = useAuth();
  const [selectedFamilies, setSelectedFamilies] = useState<('FDFP' | 'HD')[]>([]);
  const [filters, setFilters] = useState<FilterBarState>({
    city: '',
    language: '',
    isRemote: 'all',
    partySize: undefined,
  });
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWaitlist, setShowWaitlist] = useState(false);

  const loadWorkshops = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const workshopFilters: WorkshopFilters = {
        families: selectedFamilies.length > 0 ? selectedFamilies : undefined,
        city: filters.city || undefined,
        language: filters.language || undefined,
        isRemote: filters.isRemote,
        startDate: filters.startDate,
        endDate: filters.endDate,
        partySize: filters.partySize,
      };

      const result = await fetchWorkshops(workshopFilters, currentPage, PAGE_SIZE);
      setWorkshops(result.workshops);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError('Une erreur est survenue lors du chargement des ateliers.');
      console.error('Error loading workshops:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkshops();
  }, [selectedFamilies, filters, currentPage]);

  const handleFamilyToggle = (family: 'FDFP' | 'HD') => {
    setSelectedFamilies((prev) => {
      if (prev.includes(family)) {
        return prev.filter((f) => f !== family);
      } else {
        return [...prev, family];
      }
    });
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
            />
          </PaginationItem>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => setCurrentPage(pageNum)}
                  isActive={currentPage === pageNum}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={
                currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="space-y-8">
          <div className="bg-card border rounded-lg p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-wide uppercase">
                  Ateliers populaires
                </h1>
                <p className="text-muted-foreground mt-2">
                  Découvrez nos ateliers FDFP et Heure Déclic
                </p>
              </div>
              <CityDropdown
                value={filters.city}
                onValueChange={(city) => {
                  setFilters({ ...filters, city });
                  setCurrentPage(1);
                }}
                className="w-full md:w-auto min-w-[240px]"
              />
            </div>
          </div>

          <WorkshopFamilyButtons
            selectedFamilies={selectedFamilies}
            onFamilyToggle={handleFamilyToggle}
          />

          <FilterBar filters={filters} onFiltersChange={setFilters} />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                </div>
              ))}
            </div>
          ) : workshops.length === 0 ? (
            <div className="text-center py-16 space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-muted p-6">
                  <Globe className="h-16 w-16 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">Aucun atelier disponible</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Aucun atelier ne correspond à vos critères de recherche actuels.
                </p>
              </div>
              <Button onClick={() => setShowWaitlist(true)} size="lg">
                Rejoindre la liste d'attente
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workshops.map((workshop) => (
                  <WorkshopCard key={workshop.id} workshop={workshop} currentUser={profile} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center pt-8">
                  {renderPagination()}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <WaitlistDialog open={showWaitlist} onOpenChange={setShowWaitlist} />
    </div>
  );
}
