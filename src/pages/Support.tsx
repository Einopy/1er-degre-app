import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Support() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground mt-2">
          Besoin d'aide ? Contactez notre équipe
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Centre d'aide
          </CardTitle>
          <CardDescription>
            Nous sommes là pour vous aider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Envoyez-nous un email et nous vous répondrons dans les plus brefs délais
                </p>
                <Button variant="outline" asChild className="w-full">
                  <a href="mailto:hello@1erdegre.fr">
                    Envoyer un email
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Discutez en direct avec notre équipe
                </p>
                <Button variant="outline" className="w-full" disabled>
                  Bientôt disponible
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="pt-6 border-t">
            <h3 className="font-semibold mb-4">Questions fréquentes</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Comment puis-je m'inscrire à un atelier ?</h4>
                <p className="text-sm text-muted-foreground">
                  Consultez la liste des ateliers disponibles, sélectionnez celui qui vous intéresse et suivez les étapes d'inscription.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Comment devenir animateur ?</h4>
                <p className="text-sm text-muted-foreground">
                  Contactez-nous à hello@1erdegre.fr pour en savoir plus sur nos formations d'animateurs.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Quelle est la politique d'annulation ?</h4>
                <p className="text-sm text-muted-foreground">
                  Vous pouvez annuler votre participation jusqu'à 48h avant le début de l'atelier pour un remboursement complet.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
