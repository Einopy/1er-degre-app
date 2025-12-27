import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { formatPrice, type TicketTypeInfo } from '@/lib/workshop-utils';

interface TicketSelectionProps {
  ticketTypes: TicketTypeInfo[];
  selectedTicket: string | null;
  onTicketSelect: (ticketType: string) => void;
}

export function TicketSelection({ ticketTypes, selectedTicket, onTicketSelect }: TicketSelectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Choisir un billet</h3>
      <RadioGroup value={selectedTicket || ''} onValueChange={onTicketSelect}>
        <div className="grid gap-3">
          {ticketTypes.map((ticket) => (
            <label
              key={ticket.type}
              htmlFor={`ticket-${ticket.type}`}
              className="cursor-pointer"
            >
              <Card
                className={`transition-all ${
                  selectedTicket === ticket.type
                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                    : 'hover:border-primary/50'
                }`}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <RadioGroupItem
                    value={ticket.type}
                    id={`ticket-${ticket.type}`}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={`ticket-${ticket.type}`}
                        className="text-base font-semibold cursor-pointer"
                      >
                        {ticket.label}
                      </Label>
                      {selectedTicket === ticket.type && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{ticket.description}</p>
                    <p className="text-lg font-bold text-primary">
                      {ticket.price === 0 ? 'Gratuit' : formatPrice(ticket.price)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </label>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
