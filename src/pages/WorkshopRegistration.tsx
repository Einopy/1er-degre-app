import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TicketSelection } from '@/components/workshops/TicketSelection';
import { fetchWorkshopById, type WorkshopDetail } from '@/services/workshops';
import { supabase } from '@/lib/supabase';
import { formatPrice, getTicketTypes } from '@/lib/workshop-utils';
import { logHistoryEvent } from '@/services/workshop-changes';
import { AlertCircle, CheckCircle2, Loader2, ChevronLeft, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function WorkshopRegistration() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!profile) {
      navigate(`/login`, { state: { from: { pathname: `/workshops/${id}/register` } } });
      return;
    }

    loadWorkshop();
  }, [id, profile]);

  const loadWorkshop = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const data = await fetchWorkshopById(id);
      if (!data) {
        setError('Atelier introuvable');
      } else {
        setWorkshop(data);
        const ticketTypes = getTicketTypes(data.workshop_type_id, data.classification_status);
        if (ticketTypes.length > 0) {
          setSelectedTicket(ticketTypes[0].type);
        }
      }
    } catch (err: any) {
      setError('Erreur lors du chargement de l\'atelier');
      console.error('Error loading workshop:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!workshop || !selectedTicket || !profile) return;

    setIsRegistering(true);
    setError(null);

    try {
      const ticketTypes = getTicketTypes(workshop.workshop_type_id, workshop.classification_status);
      const selectedTicketInfo = ticketTypes.find((t) => t.type === selectedTicket);

      if (!selectedTicketInfo) {
        throw new Error('Type de billet invalide');
      }

      const { data: existingParticipation } = await supabase
        .from('participations')
        .select('id')
        .eq('user_id', profile.id)
        .eq('workshop_id', workshop.id)
        .neq('status', 'annule')
        .maybeSingle();

      if (existingParticipation) {
        setError('Vous êtes déjà inscrit à cet atelier');
        setIsRegistering(false);
        return;
      }

      const { error: insertError } = await (supabase.from('participations') as any).insert({
        user_id: profile.id,
        workshop_id: workshop.id,
        status: selectedTicketInfo.price === 0 ? 'inscrit' : 'en_attente',
        payment_status: selectedTicketInfo.price === 0 ? 'none' : 'pending',
        ticket_type: selectedTicket as any,
        price_paid: selectedTicketInfo.price,
        confirmation_date: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      await logHistoryEvent(
        workshop.id,
        'participant_add',
        `${profile.first_name} ${profile.last_name} registered for workshop`,
        {
          user_id: profile.id,
          user_email: profile.email,
          ticket_type: selectedTicket,
          price_paid: selectedTicketInfo.price,
          status: selectedTicketInfo.price === 0 ? 'inscrit' : 'en_attente',
          registration_type: 'self_registration',
        },
        profile.id
      );

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
      console.error('Registration error:', err);
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error || 'Atelier introuvable'}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const ticketTypes = getTicketTypes(workshop.workshop_type_id, workshop.classification_status);
  const selectedTicketInfo = ticketTypes.find((t) => t.type === selectedTicket);
  const remainingSeats = workshop.remaining_seats ?? 0;
  const isFull = remainingSeats === 0;

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Inscription confirmée !</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Votre inscription à l'atelier a été enregistrée avec succès.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirection vers votre tableau de bord...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-4">Inscription</h1>
              <Card>
                <CardHeader>
                  <CardTitle>{workshop.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(workshop.start_at), 'EEEE d MMMM yyyy', {
                          locale: fr,
                        })}
                      </span>
                    </div>
                    {!workshop.is_remote && workshop.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{(workshop.location as any).city}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Vos informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nom complet</p>
                  <p className="text-base">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-base">{profile?.email}</p>
                </div>
                {profile?.phone && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Téléphone</p>
                    <p className="text-base">{profile.phone}</p>
                  </div>
                )}
                <Separator />
                <Button variant="outline" asChild size="sm">
                  <Link to="/profile">Modifier mes informations</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8 space-y-6">
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <TicketSelection
                    ticketTypes={ticketTypes}
                    selectedTicket={selectedTicket}
                    onTicketSelect={setSelectedTicket}
                  />

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-2xl font-bold text-primary">
                        {selectedTicketInfo
                          ? selectedTicketInfo.price === 0
                            ? 'Gratuit'
                            : formatPrice(selectedTicketInfo.price)
                          : '-'}
                      </span>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleRegister}
                      disabled={isFull || !selectedTicket || isRegistering}
                    >
                      {isRegistering && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isFull ? 'Complet' : 'Confirmer l\'inscription'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Conditions d'annulation</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Annulation gratuite jusqu'à 72 heures avant le début de l'atelier.</p>
                  <p>
                    En cas de modification par l'organisateur, vous pouvez annuler gratuitement.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
