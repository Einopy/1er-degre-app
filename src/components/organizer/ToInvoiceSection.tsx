import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { OrganizerWorkshopSummary } from '@/services/organizer-workshops';

interface ToInvoiceSectionProps {
  workshops: OrganizerWorkshopSummary[];
  onInvoiced: () => void;
}

export function ToInvoiceSection({ workshops }: ToInvoiceSectionProps) {
  const uninvoicedWorkshops = workshops.filter((w) => !w.invoice_number);

  if (uninvoicedWorkshops.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Aucun atelier à facturer pour le moment
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ateliers À Facturer</CardTitle>
          <CardDescription>
            {uninvoicedWorkshops.length} atelier(s) clôturé(s) en attente de facturation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Liste des ateliers à facturer (en cours de développement)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
