import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveClient } from '@/hooks/use-active-client';
import { useWorkshopFamilies, useWorkshopTypes } from '@/hooks/use-client-config';
import { getUserProgression, type UserProgression } from '@/services/user-progression';
import { ProgressionCard } from '@/components/progression/ProgressionCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, AlertCircle, TrendingUp } from 'lucide-react';

export function MyJourney() {
  const { profile } = useAuth();
  const { activeClient } = useActiveClient();
  const { families, loading: loadingFamilies } = useWorkshopFamilies(activeClient?.id);
  const { types, loading: loadingTypes } = useWorkshopTypes(activeClient?.id);

  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-select first family
  useEffect(() => {
    if (families.length > 0 && !selectedFamilyId) {
      setSelectedFamilyId(families[0].id);
    }
  }, [families, selectedFamilyId]);

  // Load progression when family is selected
  useEffect(() => {
    if (profile?.id && activeClient?.id && selectedFamilyId) {
      loadProgression();
    }
  }, [profile?.id, activeClient?.id, selectedFamilyId]);

  const loadProgression = async () => {
    if (!profile?.id || !activeClient?.id || !selectedFamilyId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getUserProgression(profile.id, activeClient.id, selectedFamilyId);
      setProgression(data);
    } catch (err: any) {
      console.error('Error loading progression:', err);
      setError('Erreur lors du chargement de votre parcours');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Vous devez être connecté pour voir votre parcours.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loadingFamilies || loadingTypes) {
    return (
      <div className="container mx-auto p-6 max-w-4xl flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!activeClient) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucun client actif. Vous devez être affilié à un client pour voir votre parcours.
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

  const selectedFamily = families.find(f => f.id === selectedFamilyId);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {activeClient.primary_logo_url && (
          <img
            src={activeClient.primary_logo_url}
            alt={activeClient.name}
            className="h-16 w-auto object-contain"
          />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">Mon Parcours</h1>
          <p className="text-muted-foreground">
            Suivez votre progression dans le parcours d'animation de {activeClient.name}
          </p>
        </div>
      </div>

      {/* Family Selector */}
      {families.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Famille d'ateliers</CardTitle>
            <CardDescription>Sélectionnez la famille pour voir votre progression</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedFamilyId || ''} onValueChange={setSelectedFamilyId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une famille" />
              </SelectTrigger>
              <SelectContent>
                {families.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progression Display */}
      {!loading && !error && progression && (
        <>
          {/* Current Level Summary */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>Niveau actuel</CardTitle>
                  <CardDescription className="text-blue-700">
                    {progression.currentLevel > 0
                      ? `Niveau ${progression.currentLevel} - ${progression.levels[progression.currentLevel - 1]?.roleLevel.label}`
                      : 'Débutant - Commencez votre parcours'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {progression.stats && (
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{progression.stats.completedFormationIds.length}</div>
                    <div className="text-xs text-muted-foreground">Formations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{progression.stats.totalWorkshops}</div>
                    <div className="text-xs text-muted-foreground">Ateliers animés</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{progression.stats.feedbackCount}</div>
                    <div className="text-xs text-muted-foreground">Retours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {progression.stats.averageFeedback > 0 ? progression.stats.averageFeedback.toFixed(1) : '-'}
                    </div>
                    <div className="text-xs text-muted-foreground">Note moyenne</div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Level Cards */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Niveaux de progression</h2>
            </div>
            {progression.levels.map((levelProgress) => (
              <ProgressionCard
                key={levelProgress.roleLevel.id}
                levelProgress={levelProgress}
                workshopTypes={types}
              />
            ))}
          </div>
        </>
      )}

      {/* No Progression Data */}
      {!loading && !error && !progression && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Aucune donnée de progression disponible pour {selectedFamily?.name}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
