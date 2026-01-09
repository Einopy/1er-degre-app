import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveClient } from '@/hooks/use-active-client';
import { useJourneyData } from '@/hooks/use-journey-data';
import { QuestCard } from '@/components/journey/QuestCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, GraduationCap, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function MyJourneyContent() {
  const { familyCode } = useParams<{ familyCode: string }>();
  const { profile } = useAuth();
  const { activeClient } = useActiveClient();

  const {
    family,
    questCards,
    stats,
    loading,
    error,
  } = useJourneyData(profile?.id, activeClient?.id, familyCode);

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

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Famille d'ateliers introuvable. Vérifiez l'URL ou retournez à l'accueil.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calcul du niveau actuel (plus haut niveau obtenu)
  const currentLevel = questCards.filter(q => q.status === 'obtained').length;
  const obtainedCard = questCards.find(q => q.status === 'obtained' && q.roleLevel.level === currentLevel);

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {activeClient?.primary_logo_url && (
          <img
            src={activeClient.primary_logo_url}
            alt={activeClient.name}
            className="h-16 w-auto object-contain"
          />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">
            Mon Parcours {family.name}
          </h1>
          <p className="text-muted-foreground">
            {family.description || `Progressez dans le parcours ${family.name} et obtenez vos certifications`}
          </p>
        </div>
      </div>

      {/* Résumé du niveau actuel */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Niveau actuel</CardTitle>
              <CardDescription className="text-primary/80">
                {currentLevel > 0
                  ? `Niveau ${currentLevel} - ${obtainedCard?.roleLevel.label || ''}`
                  : 'Débutant - Commencez votre parcours'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        {stats && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.completedFormationIds?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Formations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.totalWorkshops || 0}</div>
                <div className="text-xs text-muted-foreground">Ateliers animés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.feedbackCount || 0}</div>
                <div className="text-xs text-muted-foreground">Retours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.averageFeedback > 0 ? stats.averageFeedback.toFixed(1) : '-'}
                </div>
                <div className="text-xs text-muted-foreground">Note moyenne</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cartes Quest */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Certifications</h2>
        </div>
        
        <div className="space-y-4">
          {questCards.map((questCard) => (
            <QuestCard
              key={questCard.roleLevel.id}
              questCard={questCard}
              familyCode={familyCode!}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function MyJourneyPage() {
  return (
    <ErrorBoundary>
      <MyJourneyContent />
    </ErrorBoundary>
  );
}
