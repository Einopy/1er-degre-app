import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatedTabs, AnimatedTabsContent, AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, XCircle, LayoutDashboard, Mail, CreditCard, Clock } from 'lucide-react';
import { fetchWorkshopById, type WorkshopDetail } from '@/services/workshops';
import { fetchWorkshopParticipants } from '@/services/organizer-workshops';
import type { ParticipantWithUser } from '@/services/organizer-workshops';
import { updateWorkshopStatus } from '@/services/organizer-workshops';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DashboardTab } from '@/components/organizer/tabs/DashboardTab';
import { CommunicationTab } from '@/components/organizer/tabs/CommunicationTab';
import { BillingTab } from '@/components/organizer/tabs/BillingTab';
import { HistoryTab } from '@/components/organizer/tabs/HistoryTab';
import { useAuth } from '@/contexts/AuthContext';
import { canManageWorkshop } from '@/lib/organizer-utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function WorkshopDetailOrganizer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [workshop, setWorkshop] = useState<WorkshopDetail | null>(null);
  const [participants, setParticipants] = useState<ParticipantWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [communicationAccordion, setCommunicationAccordion] = useState<string>('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [organizerName, setOrganizerName] = useState<string>('');
  const [coOrganizerNames, setCoOrganizerNames] = useState<Array<{ id: string; name: string }>>([]);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  const canManage = workshop && profile ? canManageWorkshop(profile, workshop) : false;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  // Reset accordion when changing tabs
  useEffect(() => {
    setCommunicationAccordion('');
  }, [activeTab]);

  useEffect(() => {
    const loadWorkshopData = async () => {
      if (!id) {
        setError('ID de l\'atelier manquant');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const workshopData = await fetchWorkshopById(id);
        if (!workshopData) {
          setError('Atelier introuvable');
          return;
        }

        setWorkshop(workshopData);

        if (!profile || !canManageWorkshop(profile, workshopData)) {
          setError('Vous n\'avez pas les permissions pour gérer cet atelier.');
          return;
        }

        const participantsData = await fetchWorkshopParticipants(id);
        setParticipants(participantsData);

        const { data: organizer } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', workshopData.organizer)
          .maybeSingle();

        if (organizer) {
          const org = organizer as { first_name: string; last_name: string };
          setOrganizerName(`${org.first_name} ${org.last_name}`);
        }

        if (workshopData.co_organizers && workshopData.co_organizers.length > 0) {
          const { data: coOrganizers } = await supabase
            .from('users')
            .select('id, first_name, last_name')
            .in('id', workshopData.co_organizers);

          if (coOrganizers && coOrganizers.length > 0) {
            setCoOrganizerNames(
              coOrganizers.map((co: { id: string; first_name: string; last_name: string }) => ({
                id: co.id,
                name: `${co.first_name} ${co.last_name}`,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Error loading workshop:', err);
        setError('Une erreur est survenue lors du chargement de l\'atelier.');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkshopData();
  }, [id, profile, navigate]);

  const handleRefreshData = async () => {
    if (!id) return;

    try {
      const workshopData = await fetchWorkshopById(id);
      if (workshopData) {
        setWorkshop(workshopData);
      }

      if (canManage) {
        const participantsData = await fetchWorkshopParticipants(id);
        setParticipants(participantsData);
      }

      // Trigger history refresh
      setHistoryRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
  };


  const handleCancelWorkshop = async () => {
    if (!workshop || !profile) return;

    try {
      await updateWorkshopStatus(workshop.id, 'canceled', profile.id);
      toast({
        title: 'Atelier annulé',
        description: 'L\'atelier a été annulé. Les participants peuvent demander un remboursement.',
      });
      handleRefreshData();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'annuler l\'atelier.',
        variant: 'destructive',
      });
    }
  };


  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !workshop || !canManage) {
    return (
      <div className="w-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>
            {error || 'Vous n\'avez pas accès à cette page'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeParticipations = participants.filter((p) =>
    ['inscrit', 'paye', 'en_attente'].includes(p.status)
  );
  const participantCount = activeParticipations.length;
  const startDate = new Date(workshop.start_at);
  const isPast = startDate < new Date();
  const isActive = workshop.lifecycle_status === 'active';
  const isCanceled = workshop.lifecycle_status === 'canceled';
  const shouldClose = isPast && isActive && !isCanceled;

  return (
    <div className="w-full">
      <div className="w-full">
        <AnimatedTabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <AnimatedTabsList className="w-full h-20 bg-muted/50 p-1.5 gap-1.5" defaultValue={activeTab}>
            <AnimatedTabsTrigger
              value="dashboard"
              className={cn(
                'flex-1 h-full flex-col gap-2 data-[state=active]:text-blue-600',
                'hover:bg-muted/50 hover:text-foreground rounded-none',
                'data-[state=inactive]:text-muted-foreground'
              )}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Dashboard</span>
            </AnimatedTabsTrigger>

            <AnimatedTabsTrigger
              value="communication"
              className={cn(
                'flex-1 h-full flex-col gap-2 data-[state=active]:text-green-600',
                'hover:bg-muted/50 hover:text-foreground rounded-none',
                'data-[state=inactive]:text-muted-foreground'
              )}
            >
              <div className="relative">
                <Mail className="h-5 w-5 flex-shrink-0" />
                {shouldClose && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive border-2 border-background" />
                )}
              </div>
              <span className="text-sm font-medium">Communication</span>
            </AnimatedTabsTrigger>

            <AnimatedTabsTrigger
              value="billing"
              className={cn(
                'flex-1 h-full flex-col gap-2 data-[state=active]:text-red-600',
                'hover:bg-muted/50 hover:text-foreground rounded-none',
                'data-[state=inactive]:text-muted-foreground'
              )}
            >
              <CreditCard className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Facturation</span>
            </AnimatedTabsTrigger>

            <AnimatedTabsTrigger
              value="history"
              className={cn(
                'flex-1 h-full flex-col gap-2 data-[state=active]:text-yellow-600',
                'hover:bg-muted/50 hover:text-foreground rounded-none',
                'data-[state=inactive]:text-muted-foreground'
              )}
            >
              <Clock className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm font-medium">Historique</span>
            </AnimatedTabsTrigger>
          </AnimatedTabsList>

          <AnimatedTabsContent value="dashboard" className="m-0 mt-6">
            <DashboardTab
              workshop={workshop}
              participants={participants}
              participantCount={participantCount}
              currentUserId={profile?.id || ''}
              onUpdate={handleRefreshData}
              organizerName={organizerName}
              coOrganizerNames={coOrganizerNames}
            />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="communication" className="m-0 mt-6">
            <CommunicationTab
              workshop={workshop}
              participants={participants}
              currentUserId={profile?.id || ''}
              activeAccordion={communicationAccordion}
              onAccordionChange={setCommunicationAccordion}
            />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="billing" className="m-0 mt-6">
            <BillingTab participants={participants} />
          </AnimatedTabsContent>

          <AnimatedTabsContent value="history" className="m-0 mt-6">
            <HistoryTab workshopId={workshop.id} refreshTrigger={historyRefreshTrigger} />
          </AnimatedTabsContent>
        </AnimatedTabs>

        {/* Primary Action Buttons - Only show on dashboard tab */}
        {activeTab === 'dashboard' && (
          <div className="mt-8 pt-6 border-t">
          <div className="flex justify-end gap-3">
            {!isPast && isActive && !isCanceled && (
              <Button
                variant="destructive"
                size="lg"
                onClick={() => setShowCancelDialog(true)}
              >
                <XCircle className="h-5 w-5 mr-2" />
                Annuler l'atelier
              </Button>
            )}
            </div>
          </div>
        )}

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cet atelier</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera l'atelier. Tous les participants seront notifiés et
              pourront demander un remboursement complet sans frais. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelWorkshop}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l'annulation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
