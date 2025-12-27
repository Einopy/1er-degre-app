import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store } from 'lucide-react';

export function Shop() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">La boutique</h1>
        <p className="text-muted-foreground mt-2">
          Découvrez nos produits et matériels
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Boutique
          </CardTitle>
          <CardDescription>
            Cette section sera bientôt disponible
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Vous pourrez bientôt commander du matériel et des supports pour vos ateliers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
