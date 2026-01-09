import { Navigate } from 'react-router-dom';
import { useActiveClient } from '@/hooks/use-active-client';
import { useWorkshopFamilies } from '@/hooks/use-client-config';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * Router pour /parcours
 * - Si 1 seule famille → redirige vers /parcours/{familyCode}
 * - Si plusieurs familles → redirige vers la première famille
 */
export function MyJourneyRouter() {
  const { activeClient } = useActiveClient();
  const { families, loading, error } = useWorkshopFamilies(activeClient?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !activeClient) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Aucun client actif. Vous devez être affilié à un client pour voir votre parcours.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (families.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucune famille d'ateliers n'est disponible pour ce client.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Rediriger vers la première famille (ou l'unique famille)
  return <Navigate to={`/parcours/${families[0].code}`} replace />;
}
