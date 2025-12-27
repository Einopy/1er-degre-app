import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { History, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WorkshopWizard } from './wizard/WorkshopWizard';

export function PastWorkshopForm() {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Déclarer un atelier passé
          </CardTitle>
          <CardDescription>
            Enregistrez un atelier qui a déjà eu lieu pour le suivi et la facturation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Pour les ateliers passés :</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>L'atelier sera marqué comme clôturé</li>
                  <li>Aucune notification pré-atelier ne sera envoyée</li>
                  <li>Vous pouvez activer les emails de suivi (J+7, J+14, J+21)</li>
                  <li>Si applicable, l'assistant de facturation professionnelle sera proposé</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <Button onClick={() => setWizardOpen(true)} size="lg" className="w-full">
            <History className="h-5 w-5 mr-2" />
            Déclarer un atelier passé
          </Button>
        </CardContent>
      </Card>

      <WorkshopWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        isPastWorkshop={true}
      />
    </>
  );
}
