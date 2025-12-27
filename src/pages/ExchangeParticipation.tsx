import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  fetchUserParticipations,
  fetchAvailableWorkshopsForExchange,
  exchangeParticipation,
  type ParticipationWithWorkshop,
} from '@/services/participations';
import type { Workshop } from '@/lib/database.types';
import { Calendar, MapPin, Monitor, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatPrice } from '@/lib/workshop-utils';

export function ExchangeParticipation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [participation, setParticipation] = useState<ParticipationWithWorkshop | null>(null);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExchanging, setIsExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id, profile?.id]);

  const loadData = async () => {
    if (!id || !profile?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      const [participations, availableWorkshops] = await Promise.all([
        fetchUserParticipations(profile.id),
        fetchAvailableWorkshopsForExchange(),
      ]);

      const currentParticipation = participations.find((p) => p.id === id);
      if (!currentParticipation) {
        setError('Participation introuvable');
        return;
      }

      setParticipation(currentParticipation);
      setWorkshops(availableWorkshops.filter((w) => w.id !== currentParticipation.workshop_id));
    } catch (err: any) {
      setError('Erreur lors du chargement des données');
      console.error('Error loading exchange data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExchangeConfirm = async () => {
    if (!selectedWorkshop || !participation || !profile?.id) return;

    try {
      setIsExchanging(true);
      setError(null);

      await exchangeParticipation(
        participation.id,
        selectedWorkshop.id,
        profile.id,
        participation.ticket_type,
        participation.price_paid
      );

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'échange');
      setIsExchanging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !participation) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error || 'Participation introuvable'}</AlertDescription>
            </Alert>
            <Button asChild className="w-full mt-4">
              <Link to="/dashboard">Retour au tableau de bord</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Échanger ma participation</h1>
            <p className="text-muted-foreground mt-2">
              Sélectionnez un nouvel atelier pour échanger votre participation
            </p>
          </div>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Participation actuelle</CardTitle>
                <Badge variant="outline">À échanger</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">{participation.workshop.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(participation.workshop.start_at), 'EEEE d MMMM yyyy à HH:mm', {
                        locale: fr,
                      })}
                    </span>
                  </div>
                  {participation.workshop.is_remote ? (
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>À distance</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>Présentiel</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{formatPrice(participation.price_paid)}</Badge>
                  <Badge variant="secondary">{participation.ticket_type}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Ateliers disponibles</h2>
            {workshops.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    Aucun atelier disponible pour l'échange pour le moment
                  </p>
                  <Button asChild className="mt-4" variant="outline">
                    <Link to="/dashboard">Retour au tableau de bord</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {workshops.map((workshop) => (
                  <Card
                    key={workshop.id}
                    className={`cursor-pointer transition-colors hover:border-primary ${
                      selectedWorkshop?.id === workshop.id ? 'border-primary border-2' : ''
                    }`}
                    onClick={() => setSelectedWorkshop(workshop)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{workshop.title}</CardTitle>
                        </div>
                        {selectedWorkshop?.id === workshop.id && (
                          <Badge variant="default">Sélectionné</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {format(new Date(workshop.start_at), 'EEEE d MMMM yyyy à HH:mm', {
                              locale: fr,
                            })}
                          </span>
                        </div>
                        {workshop.is_remote ? (
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            <span>À distance</span>
                          </div>
                        ) : workshop.location ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {(workshop.location as any).city}, {(workshop.location as any).country}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      {workshop.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {workshop.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{workshop.workshop_family_id}</Badge>
                        <Badge variant="secondary">{workshop.workshop_type_id}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {selectedWorkshop && (
            <div className="flex gap-3 justify-end sticky bottom-0 bg-background border-t pt-4 pb-4">
              <Button variant="outline" onClick={() => setSelectedWorkshop(null)}>
                Annuler la sélection
              </Button>
              <Button onClick={() => setSelectedWorkshop(selectedWorkshop)}>
                Confirmer l'échange
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

      <AlertDialog
        open={!!selectedWorkshop && !isExchanging}
        onOpenChange={() => !isExchanging && setSelectedWorkshop(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'échange</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Vous êtes sur le point d'échanger votre participation à l'atelier "
                <strong>{participation.workshop.title}</strong>" pour l'atelier "
                <strong>{selectedWorkshop?.title}</strong>".
              </p>
              <p className="text-sm">
                Cette action est irréversible. Votre participation actuelle sera marquée comme échangée et
                vous ne pourrez pas revenir en arrière.
              </p>
              <p className="text-sm font-medium">
                Le même type de billet et le même montant seront appliqués à votre nouvelle participation.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExchanging}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleExchangeConfirm} disabled={isExchanging}>
              {isExchanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmer l'échange
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
