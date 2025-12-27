import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  cancelParticipation,
  canRefundParticipation,
  canExchangeParticipation,
  getRefundReason,
  type ParticipationWithWorkshop,
} from '@/services/participations';
import { Calendar, MapPin, Monitor, AlertCircle, Loader2, ArrowLeftRight, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatPrice } from '@/lib/workshop-utils';

export function Dashboard() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'workshops';

  const [participations, setParticipations] = useState<ParticipationWithWorkshop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedParticipation, setSelectedParticipation] =
    useState<ParticipationWithWorkshop | null>(null);

  useEffect(() => {
    loadParticipations();
  }, [profile?.id]);

  const loadParticipations = async () => {
    if (!profile?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchUserParticipations(profile.id);
      setParticipations(data);
    } catch (err: any) {
      setError('Erreur lors du chargement de vos participations');
      console.error('Error loading participations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelClick = (participation: ParticipationWithWorkshop) => {
    setSelectedParticipation(participation);
  };

  const handleCancelConfirm = async () => {
    if (!selectedParticipation) return;

    try {
      setCancellingId(selectedParticipation.id);
      await cancelParticipation(selectedParticipation.id);
      await loadParticipations();
      setSelectedParticipation(null);
    } catch (err: any) {
      setError('Erreur lors de l\'annulation');
      console.error('Error cancelling participation:', err);
    } finally {
      setCancellingId(null);
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      en_attente: { variant: 'secondary', label: 'En attente' },
      inscrit: { variant: 'default', label: 'Inscrit' },
      paye: { variant: 'default', label: 'Payé' },
      rembourse: { variant: 'outline', label: 'Remboursé' },
      echange: { variant: 'outline', label: 'Échangé' },
      annule: { variant: 'destructive', label: 'Annulé' },
    };
    const { variant, label } = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const upcomingParticipations = participations.filter(
    (p) => new Date(p.workshop.start_at) > new Date() && p.status !== 'annule'
  );

  const pastParticipations = participations.filter(
    (p) => new Date(p.workshop.start_at) <= new Date() || p.status === 'annule'
  );

  return (
    <div className="space-y-8">
      <div>
          <h1 className="text-3xl font-bold tracking-tight">
          Bonjour {profile?.first_name} !
          </h1>
          <p className="text-muted-foreground mt-2">
          Gérez vos inscriptions et participations aux ateliers
          </p>
      </div>

      {error && (
          <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          </Alert>
      )}

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workshops">Mes Ateliers</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="questionnaires">Questionnaires</TabsTrigger>
          </TabsList>

          <TabsContent value="workshops" className="space-y-6 mt-6">
          <div className="flex gap-4">
          <Button asChild>
              <Link to="/">Découvrir les ateliers</Link>
          </Button>
          </div>

          {isLoading ? (
          <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          ) : (
          <>
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Ateliers à venir</h2>
                {upcomingParticipations.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">
                        Vous n'avez pas d'ateliers à venir
                      </p>
                      <Button asChild className="mt-4">
                        <Link to="/">Explorer les ateliers</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {upcomingParticipations.map((participation) => {
                      const canRefund = canRefundParticipation(participation);
                      const canExchange = canExchangeParticipation(participation);
                      const refundReason = getRefundReason(participation);

                      return (
                        <Card key={participation.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <CardTitle className="text-xl">
                                  <Link
                                    to={`/workshops/${participation.workshop.id}`}
                                    className="hover:underline"
                                  >
                                    {participation.workshop.title}
                                  </Link>
                                </CardTitle>
                                <div className="flex flex-wrap gap-2">
                                  {getStatusBadge(participation.status)}
                                  <Badge variant="outline">{formatPrice(participation.price_paid)}</Badge>
                                  <Badge variant="secondary">{participation.ticket_type}</Badge>
                                  {participation.exchange_parent_participation_id && (
                                    <Badge variant="outline" className="gap-1">
                                      <ArrowLeftRight className="h-3 w-3" />
                                      Échangé
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {format(
                                    new Date(participation.workshop.start_at),
                                    'EEEE d MMMM yyyy à HH:mm',
                                    { locale: fr }
                                  )}
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

                            {refundReason && (
                              <Alert>
                                <Info className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                  <strong>Annulation possible :</strong> {refundReason}
                                </AlertDescription>
                              </Alert>
                            )}

                            {(canRefund || canExchange) && (
                              <>
                                <Separator />
                                <div className="flex gap-3">
                                  {canRefund && (
                                    <Button
                                      variant="outline"
                                      onClick={() => handleCancelClick(participation)}
                                      disabled={cancellingId === participation.id}
                                    >
                                      {cancellingId === participation.id && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      )}
                                      Annuler ma participation
                                    </Button>
                                  )}
                                  {canExchange && (
                                    <Button
                                      variant="outline"
                                      asChild
                                    >
                                      <Link to={`/participations/${participation.id}/exchange`}>
                                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                                        Échanger
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {pastParticipations.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold">Historique</h2>
                  <div className="grid gap-4">
                    {pastParticipations.map((participation) => (
                      <Card key={participation.id} className="opacity-80">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <CardTitle className="text-xl">
                                <Link
                                  to={`/workshops/${participation.workshop.id}`}
                                  className="hover:underline"
                                >
                                  {participation.workshop.title}
                                </Link>
                              </CardTitle>
                              <div className="flex flex-wrap gap-2">
                                {getStatusBadge(participation.status)}
                                {participation.exchange_parent_participation_id && (
                                  <Badge variant="outline" className="gap-1">
                                    <ArrowLeftRight className="h-3 w-3" />
                                    Échangé
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(
                                new Date(participation.workshop.start_at),
                                'd MMMM yyyy',
                                { locale: fr }
                              )}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
                </>
              )}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6 mt-6">
              <Card>
                <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                La section factures sera bientôt disponible
              </p>
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="questionnaires" className="space-y-6 mt-6">
              <Card>
                <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                La section questionnaires sera bientôt disponible
              </p>
                </CardContent>
              </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={!!selectedParticipation}
        onOpenChange={() => setSelectedParticipation(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'annulation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir annuler votre participation à cet atelier ? Cette
              action est irréversible et un remboursement sera traité selon nos conditions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
