import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { ExternalLink, Info } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ParticipantWithUser } from '@/services/organizer-workshops';
import { formatPrice } from '@/lib/workshop-utils';

interface BillingTabProps {
  participants: ParticipantWithUser[];
}

export function BillingTab({ participants }: BillingTabProps) {
  const paidParticipants = participants.filter((p) => p.payment_status === 'paid');
  const totalRevenue = paidParticipants.reduce((sum, p) => sum + parseFloat(p.price_paid.toString() || '0'), 0);

  return (
    <div className="w-full space-y-6">
      <Alert className="border-blue-500 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          L'intégration avec Odoo pour la gestion comptable sera disponible prochainement.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Factures</CardTitle>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Revenu total</p>
              <p className="text-2xl font-bold text-primary">{formatPrice(totalRevenue)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paidParticipants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune facture disponible pour le moment
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type de billet</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Date de paiement</TableHead>
                    <TableHead className="text-center">Facture</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidParticipants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">
                        {participant.user.first_name} {participant.user.last_name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {participant.user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {participant.ticket_type === 'normal' && 'Normal'}
                          {participant.ticket_type === 'reduit' && 'Réduit'}
                          {participant.ticket_type === 'gratuit' && 'Gratuit'}
                          {participant.ticket_type === 'pro' && 'Pro'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(parseFloat(participant.price_paid.toString()))}
                      </TableCell>
                      <TableCell className="text-sm">
                        {participant.confirmation_date
                          ? format(new Date(participant.confirmation_date), 'dd MMM yyyy', {
                              locale: fr,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {participant.invoice_url ? (
                          <a
                            href={participant.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            Voir
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatPrice(totalRevenue)}
                    </TableCell>
                    <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">
                      {paidParticipants.length} paiement{paidParticipants.length > 1 ? 's' : ''}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
