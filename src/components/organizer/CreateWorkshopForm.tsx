import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserWorkshopPermissions, getPermissionLabel } from '@/lib/organizer-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarPlus, History, Info } from 'lucide-react';
import { FutureWorkshopForm } from './FutureWorkshopForm';
import { PastWorkshopForm } from './PastWorkshopForm';

export function CreateWorkshopForm() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'future' | 'past'>('future');

  const userPermissions = getUserWorkshopPermissions(profile);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un Atelier</CardTitle>
        <CardDescription>
          Planifiez un atelier à venir ou déclarez un atelier passé
        </CardDescription>
        {userPermissions.length > 0 && (
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Vos permissions :</p>
                <div className="flex flex-wrap gap-2">
                  {userPermissions.map(permission => (
                    <Badge key={permission} variant="secondary">
                      {getPermissionLabel(permission)}
                    </Badge>
                  ))}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'future' | 'past')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="future" className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              Planifier un atelier
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-2">
              <History className="h-4 w-4" />
              Déclarer un atelier passé
            </TabsTrigger>
          </TabsList>

          <TabsContent value="future" className="space-y-4 mt-6">
            <FutureWorkshopForm />
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-6">
            <PastWorkshopForm />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
