import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

export function ResourcesFDFP() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ressources FDFP</h1>
        <p className="text-muted-foreground mt-2">
          Accédez aux ressources de la Fresque du Faire ensemble
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Ressources FDFP
          </CardTitle>
          <CardDescription>
            Cette section sera bientôt disponible
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Vous pourrez bientôt accéder aux supports, guides et ressources pour animer des ateliers FDFP.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
