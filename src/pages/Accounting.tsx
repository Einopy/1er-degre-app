import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function Accounting() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ma compta</h1>
        <p className="text-muted-foreground mt-2">
          Gérez vos factures et revenus
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comptabilité</CardTitle>
          <CardDescription>
            Cette section sera bientôt disponible
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Vous pourrez bientôt consulter vos factures, revenus et statistiques financières ici.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
