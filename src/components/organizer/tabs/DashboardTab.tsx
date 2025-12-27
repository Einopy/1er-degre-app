import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WorkshopInfoCard } from '@/components/organizer/WorkshopInfoCard';
import { ParticipantQuickAdd } from '@/components/organizer/ParticipantQuickAdd';
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
import {
  AlertTriangle,
  Copy,
  Check,
  Download,
  X,
  Mail,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';
import type { Workshop, MailLog } from '@/lib/database.types';
import type { ParticipantWithUser } from '@/services/organizer-workshops';
import { getUnconfirmedParticipants } from '@/services/workshop-changes';
import {
  updateParticipantAttendance,
  refundParticipation,
  removeParticipant,
  cancelParticipation,
  reinscribeParticipant,
  generateRegistrationUrl,
} from '@/services/organizer-workshops';
import { downloadICS } from '@/lib/ics-generator';
import { useToast } from '@/hooks/use-toast';
import { getFailedEmailsForParticipant } from '@/services/email-tracking';
import { sendWorkshopEmail, prepareRecipientsFromParticipants } from '@/services/email-sending';

const STATUS_CONFIG = {
  inscrit: { label: 'Inscrit', color: 'bg-blue-100 text-blue-800' },
  paye: { label: 'Payé', color: 'bg-green-100 text-green-800' },
  rembourse: { label: 'Remboursé', color: 'bg-amber-100 text-amber-800' },
  annule: { label: 'Annulé', color: 'bg-gray-100 text-gray-800' },
  en_attente: { label: 'En attente', color: 'bg-gray-50 text-gray-600' },
  echange: { label: 'Échange', color: 'bg-purple-100 text-purple-800' },
};

interface DashboardTabProps {
  workshop: Workshop;
  participants: ParticipantWithUser[];
  participantCount: number;
  currentUserId: string;
  onUpdate: () => void;
  organizerName?: string;
  coOrganizerNames?: Array<{ id: string; name: string }>;
}

export function DashboardTab({
  workshop,
  participants,
  participantCount,
  currentUserId,
  onUpdate,
  organizerName,
  coOrganizerNames = [],
}: DashboardTabProps) {
  const { toast } = useToast();
  const [unconfirmedDate, setUnconfirmedDate] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [unconfirmedLocation, setUnconfirmedLocation] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedAction, setSelectedAction] = useState<{ type: 'refund' | 'remove' | 'cancel' | 'reinscribe'; participant: ParticipantWithUser } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [failedEmails, setFailedEmails] = useState<Map<string, MailLog[]>>(new Map());
  const [retryingEmail, setRetryingEmail] = useState<string | null>(null);

  const isPastOrClosed = new Date(workshop.end_at) < new Date() || workshop.lifecycle_status === 'closed';
  const alertKey = `alert_dismissed_${workshop.id}_${currentUserId}`;

  useEffect(() => {
    if (workshop.modified_date_flag) {
      getUnconfirmedParticipants(workshop.id, 'date').then(setUnconfirmedDate);
    }
    if (workshop.modified_location_flag) {
      getUnconfirmedParticipants(workshop.id, 'location').then(setUnconfirmedLocation);
    }

    const dismissed = localStorage.getItem(alertKey);
    setAlertDismissed(dismissed === 'true');

    const loadFailedEmails = async () => {
      const failedEmailsMap = new Map<string, MailLog[]>();
      for (const participant of participants) {
        const failed = await getFailedEmailsForParticipant(workshop.id, participant.id);
        if (failed.length > 0) {
          failedEmailsMap.set(participant.id, failed);
        }
      }
      setFailedEmails(failedEmailsMap);
    };

    loadFailedEmails();
  }, [workshop.id, workshop.modified_date_flag, workshop.modified_location_flag, alertKey, participants]);

  const handleDismissAlert = () => {
    localStorage.setItem(alertKey, 'true');
    setAlertDismissed(true);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
    toast({
      description: 'Email copié dans le presse-papier',
    });
  };

  const handleDownloadICS = () => {
    try {
      downloadICS(workshop);
      toast({
        title: 'Invitation téléchargée',
        description: 'Le fichier .ics a été téléchargé avec succès.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le fichier .ics.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/workshops/${workshop.id}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Lien copié',
      description: 'Le lien d\'inscription a été copié dans le presse-papier.',
    });
  };

  const handleReinscribe = async () => {
    if (!selectedAction || selectedAction.type !== 'reinscribe') return;

    try {
      setIsProcessing(true);
      await reinscribeParticipant(selectedAction.participant.id, workshop.id, currentUserId);
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
      await refundParticipation(selectedAction.participant.id, workshop.id, currentUserId);
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
      await removeParticipant(selectedAction.participant.id, workshop.id, currentUserId);
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

  const handleCancel = async () => {
    if (!selectedAction || selectedAction.type !== 'cancel') return;

    try {
      setIsProcessing(true);
      await cancelParticipation(selectedAction.participant.id, workshop.id, currentUserId);
      toast({
        title: 'Participation annulée',
        description: 'La participation a été annulée avec succès.',
      });
      onUpdate();
      setSelectedAction(null);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'annuler la participation.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendPaymentReminder = (participant: ParticipantWithUser) => {
    const url = generateRegistrationUrl(
      workshop.id,
      participant.user.first_name,
      participant.user.last_name,
      participant.user.email
    );

    navigator.clipboard.writeText(url);
    toast({
      title: 'Lien copié',
      description: 'Le lien de paiement a été copié. Envoyez-le au participant par email.',
    });
  };

  const handleRetryEmail = async (participant: ParticipantWithUser, failedEmail: MailLog) => {
    try {
      setRetryingEmail(participant.id);

      const recipients = prepareRecipientsFromParticipants([participant]);

      const emailContent = failedEmail.email_type === 'pre'
        ? { subject: workshop.mail_pre_subject || failedEmail.subject, html: workshop.mail_pre_html || '' }
        : failedEmail.email_type === 'post'
        ? { subject: workshop.mail_post_subject || failedEmail.subject, html: workshop.mail_post_html || '' }
        : { subject: failedEmail.subject, html: '' };

      await sendWorkshopEmail({
        workshop,
        recipients,
        subject: emailContent.subject,
        htmlContent: emailContent.html,
        emailType: failedEmail.email_type as 'pre' | 'post' | 'spontane',
        currentUserId,
      });

      toast({
        title: 'Email renvoyé',
        description: `L'email a été renvoyé avec succès à ${participant.user.email}`,
      });

      const updatedFailed = await getFailedEmailsForParticipant(workshop.id, participant.id);
      setFailedEmails(prev => {
        const newMap = new Map(prev);
        if (updatedFailed.length > 0) {
          newMap.set(participant.id, updatedFailed);
        } else {
          newMap.delete(participant.id);
        }
        return newMap;
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de renvoyer l\'email',
        variant: 'destructive',
      });
    } finally {
      setRetryingEmail(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.inscrit;
    return (
      <Badge className={`text-xs ${statusConfig.color} pointer-events-none`}>
        {statusConfig.label}
      </Badge>
    );
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

  const confirmedCount = participants.filter((p) => {
    const needsDateConfirmation = unconfirmedDate.some((u) => u.id === p.id);
    const needsLocationConfirmation = unconfirmedLocation.some((u) => u.id === p.id);
    return !needsDateConfirmation && !needsLocationConfirmation && ['inscrit', 'paye'].includes(p.status);
  }).length;

  const showConfirmationBanner = (workshop.modified_date_flag || workshop.modified_location_flag) && confirmedCount > 0;

  return (
    <div className="w-full space-y-6">
      {(workshop.modified_date_flag || workshop.modified_location_flag) && !alertDismissed && (
        <Alert variant="default" className="border-orange-500 bg-orange-50 relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0"
            onClick={handleDismissAlert}
          >
            <X className="h-4 w-4" />
          </Button>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">Modifications apportées</AlertTitle>
          <AlertDescription className="text-orange-800">
            Les participants seront informés qu'ils peuvent annuler sans frais ou échanger leur
            place suite à {workshop.modified_date_flag && workshop.modified_location_flag
              ? 'ces modifications'
              : workshop.modified_date_flag
              ? 'ce changement de date'
              : 'ce changement de lieu'}.
          </AlertDescription>
        </Alert>
      )}

      {showConfirmationBanner && (
        <Alert className="border-blue-500 bg-blue-50">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">Confirmations reçues</AlertTitle>
          <AlertDescription className="text-blue-800">
            <span className="font-bold text-blue-600">{confirmedCount}</span> participant{confirmedCount > 1 ? 's ont' : ' a'} confirmé leur présence à l'atelier.
          </AlertDescription>
        </Alert>
      )}

      <WorkshopInfoCard
        workshop={workshop}
        participantCount={participantCount}
        currentUserId={currentUserId}
        onUpdate={onUpdate}
        organizerName={organizerName}
        coOrganizerNames={coOrganizerNames}
      />

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleDownloadICS}>
          <Download className="h-4 w-4 mr-2" />
          Télécharger l'invitation (.ics)
        </Button>
        <Button variant="outline" onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-2" />
          Copier le lien d'inscription
        </Button>
      </div>

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
                    <TableHead>Participants</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    {isPastOrClosed && <TableHead className="text-center">Présence</TableHead>}
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getSortedParticipants().map((participant) => {
                    return (
                      <TableRow key={participant.id}>
                        <TableCell className="font-medium">
                          {participant.user.first_name} {participant.user.last_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{participant.user.email}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
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
                        {isPastOrClosed && (
                          <TableCell className="text-center">
                            {canShowPresence(participant.status) && (
                              <Checkbox
                                checked={participant.attended ?? true}
                                onCheckedChange={(checked) =>
                                  handleAttendanceChange(participant.id, checked === true)
                                }
                              />
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-56">
                                {failedEmails.has(participant.id) && failedEmails.get(participant.id)!.map((failedEmail, idx) => (
                                  <DropdownMenuItem
                                    key={`retry-${failedEmail.id}-${idx}`}
                                    onClick={() => handleRetryEmail(participant, failedEmail)}
                                    disabled={retryingEmail === participant.id}
                                    className="py-3 cursor-pointer"
                                  >
                                    <Mail className="h-4 w-4 mr-3" />
                                    <div className="flex flex-col">
                                      <span className="font-medium">Renvoyer l'email</span>
                                      <span className="text-xs text-muted-foreground">
                                        {failedEmail.email_type === 'pre' ? 'Pré-atelier' : failedEmail.email_type === 'post' ? 'Post-atelier' : 'Spontané'}
                                        {failedEmail.error_message && ` - ${failedEmail.error_message.substring(0, 30)}...`}
                                      </span>
                                    </div>
                                  </DropdownMenuItem>
                                ))}
                                {participant.status === 'inscrit' && (
                                  <DropdownMenuItem
                                    onClick={() => handleSendPaymentReminder(participant)}
                                    className="py-3 cursor-pointer"
                                  >
                                    <Mail className="h-4 w-4 mr-3" />
                                    <span className="font-medium">Régler participation</span>
                                  </DropdownMenuItem>
                                )}
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
                                {['rembourse', 'annule'].includes(participant.status) ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setSelectedAction({ type: 'reinscribe', participant })
                                    }
                                    className="py-3 cursor-pointer font-medium"
                                  >
                                    Ré-inscrire le participant
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setSelectedAction({ type: 'cancel', participant })
                                    }
                                    className="py-3 cursor-pointer bg-red-50 hover:bg-red-100 focus:bg-red-100 text-destructive font-medium"
                                  >
                                    Annuler
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ParticipantQuickAdd
        workshopId={workshop.id}
        existingParticipants={participants}
        currentUserId={currentUserId}
        onParticipantsAdded={onUpdate}
      />

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
        open={selectedAction?.type === 'cancel'}
        onOpenChange={(open) => !open && setSelectedAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette participation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir annuler cette participation ? Le participant sera marqué comme annulé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Fermer</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer l'annulation
            </AlertDialogAction>
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
