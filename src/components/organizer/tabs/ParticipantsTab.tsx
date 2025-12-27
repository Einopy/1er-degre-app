import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChevronDown, ExternalLink, Copy, Check } from 'lucide-react';
import type { ParticipantWithUser } from '@/services/organizer-workshops';
import {
  updateParticipantAttendance,
  refundParticipation,
  removeParticipant,
  reinscribeParticipant,
} from '@/services/organizer-workshops';
import { useToast } from '@/hooks/use-toast';

interface ParticipantsTabProps {
  participants: ParticipantWithUser[];
  workshopId: string;
  workshopStartDate: string;
  workshopLifecycleStatus: string;
  currentUserId: string;
  onUpdate: () => void;
}

export function ParticipantsTab({
  participants,
  workshopId,
  workshopStartDate,
  workshopLifecycleStatus,
  currentUserId,
  onUpdate,
}: ParticipantsTabProps) {
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<{ type: 'refund' | 'remove' | 'reinscribe'; participant: ParticipantWithUser } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const isPastOrClosed =
    new Date(workshopStartDate) < new Date() || workshopLifecycleStatus === 'closed';

  const handleAttendanceChange = async (participationId: string, attended: boolean) => {
    try {
      await updateParticipantAttendance(participationId, attended);
      toast({
        title: 'Présence mise à jour',
        description: 'La présence du participant a été enregistrée.',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la présence.',
        variant: 'destructive',
      });
    }
  };

  const handleRefund = async () => {
    if (!selectedAction || selectedAction.type !== 'refund') return;

    try {
      setIsProcessing(true);
      await refundParticipation(selectedAction.participant.id, workshopId, currentUserId);
      toast({
        title: 'Remboursement effectué',
        description: 'Le participant a été remboursé avec succès.',
      });
      onUpdate();
      setSelectedAction(null);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'effectuer le remboursement.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async () => {
    if (!selectedAction || selectedAction.type !== 'remove') return;

    try {
      setIsProcessing(true);
      await removeParticipant(selectedAction.participant.id, workshopId, currentUserId);
      toast({
        title: 'Participant retiré',
        description: 'Le participant a été retiré de l\'atelier.',
      });
      onUpdate();
      setSelectedAction(null);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de retirer le participant.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReinscribe = async () => {
    if (!selectedAction || selectedAction.type !== 'reinscribe') return;

    try {
      setIsProcessing(true);
      await reinscribeParticipant(selectedAction.participant.id, workshopId, currentUserId);
      toast({
        title: 'Participant réinscrit',
        description: 'Le participant a été réinscrit avec succès.',
      });
      onUpdate();
      setSelectedAction(null);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de réinscrire le participant.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    toast({
      description: 'Email copié dans le presse-papier',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      en_attente: { variant: 'secondary', label: 'En attente' },
      inscrit: { variant: 'default', label: 'Inscrit' },
      paye: { variant: 'default', label: 'Payé' },
      rembourse: { variant: 'outline', label: 'Remboursé' },
      echange: { variant: 'secondary', label: 'Échangé' },
      annule: { variant: 'destructive', label: 'Annulé' },
    };
    const { variant, label } = variants[status] || variants.inscrit;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTicketBadge = (type: string) => {
    const labels: Record<string, string> = {
      normal: 'Normal',
      reduit: 'Réduit',
      gratuit: 'Gratuit',
      pro: 'Pro',
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const canShowPresence = (status: string) => {
    return ['inscrit', 'paye'].includes(status);
  };

  const getActiveParticipantCount = () => {
    return participants.filter(p => ['paye', 'inscrit'].includes(p.status)).length;
  };

  const getSortedParticipants = () => {
    const statusOrder: Record<string, number> = {
      paye: 1,
      inscrit: 2,
      rembourse: 3,
      annule: 4,
      echange: 5,
      en_attente: 6,
    };

    return [...participants].sort((a, b) => {
      const orderA = statusOrder[a.status] || 999;
      const orderB = statusOrder[b.status] || 999;
      return orderA - orderB;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Participants ({getActiveParticipantCount()})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun participant pour le moment
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Présence</TableHead>
                    <TableHead className="text-center">Facture</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedParticipants().map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(participant.user.first_name, participant.user.last_name)}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        {participant.user.first_name} {participant.user.last_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{participant.user.email}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyEmail(participant.user.email)}
                          >
                            {copiedEmail === participant.user.email ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(participant.status)}</TableCell>
                      <TableCell>{getTicketBadge(participant.ticket_type)}</TableCell>
                      <TableCell className="text-center">
                        {canShowPresence(participant.status) && isPastOrClosed && (
                          <Checkbox
                            checked={participant.attended || false}
                            onCheckedChange={(checked) =>
                              handleAttendanceChange(participant.id, checked === true)
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {participant.invoice_url && (
                          <a
                            href={participant.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            Voir
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <ChevronDown className="h-3.5 w-3.5" />
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56">
                            {participant.payment_status === 'paid' &&
                              participant.status !== 'rembourse' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setSelectedAction({ type: 'refund', participant })
                                  }
                                  className="py-3 cursor-pointer"
                                >
                                  <span className="font-medium">Rembourser</span>
                                </DropdownMenuItem>
                              )}
                            {['rembourse', 'annule'].includes(participant.status) && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setSelectedAction({ type: 'reinscribe', participant })
                                }
                                className="py-3 cursor-pointer font-medium"
                              >
                                Ré-inscrire le participant
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() =>
                                setSelectedAction({ type: 'remove', participant })
                              }
                              className="py-3 cursor-pointer bg-red-50 hover:bg-red-100 focus:bg-red-100 text-destructive font-medium"
                            >
                              Retirer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={selectedAction?.type === 'refund'}
        onOpenChange={(open) => !open && setSelectedAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le remboursement</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir rembourser ce participant ? Le statut sera mis à jour et
              le participant sera notifié.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefund} disabled={isProcessing}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={selectedAction?.type === 'remove'}
        onOpenChange={(open) => !open && setSelectedAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce participant</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAction?.participant.payment_status === 'paid' &&
              selectedAction?.participant.status !== 'rembourse'
                ? 'Ce participant a payé. Veuillez d\'abord effectuer le remboursement avant de le retirer.'
                : 'Êtes-vous sûr de vouloir retirer ce participant de l\'atelier ? Cette action est irréversible.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              {selectedAction?.participant.payment_status === 'paid' &&
              selectedAction?.participant.status !== 'rembourse'
                ? 'Fermer'
                : 'Annuler'}
            </AlertDialogCancel>
            {selectedAction?.participant.payment_status !== 'paid' ||
            selectedAction?.participant.status === 'rembourse' ? (
              <AlertDialogAction
                onClick={handleRemove}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmer
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={selectedAction?.type === 'reinscribe'}
        onOpenChange={(open) => !open && setSelectedAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ré-inscrire ce participant</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir ré-inscrire ce participant ? Le statut sera changé à "Inscrit" et le statut de paiement sera réinitialisé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleReinscribe} disabled={isProcessing}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
