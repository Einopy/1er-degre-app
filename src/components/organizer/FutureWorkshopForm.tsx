import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarPlus, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WorkshopWizard } from './wizard/WorkshopWizard';

export function FutureWorkshopForm() {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Planifier un atelier à venir
          </CardTitle>
          <CardDescription>
            Créez un atelier qui sera visible pour les inscriptions et enverra des notifications automatiques aux participants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Ce qui sera fait automatiquement :</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Publication de l'atelier pour les inscriptions</li>
                  <li>Notification aux organisateurs 96h avant (T-96h)</li>
                  <li>Notification aux participants 72h avant (T-72h)</li>
                  <li>Génération d'un fichier ICS pour l'ajout au calendrier</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <Button onClick={() => setWizardOpen(true)} size="lg" className="w-full">
            <CalendarPlus className="h-5 w-5 mr-2" />
            Commencer la planification
          </Button>
        </CardContent>
      </Card>

      <WorkshopWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        isPastWorkshop={false}
      />
    </>
  );
}
