import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Package } from 'lucide-react';

export function AdminOrdersTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des commandes</h2>
          <p className="text-muted-foreground">
            Commandes de jeux de cartes et produits
          </p>
        </div>
        <Button variant="outline">
          <Package className="mr-2 h-4 w-4" />
          Exporter commandes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des commandes</CardTitle>
          <CardDescription>
            Gérer les commandes, paiements et expéditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par numéro de commande ou client..."
                  className="pl-9"
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtres
              </Button>
            </div>

            <div className="border rounded-lg p-12 text-center text-muted-foreground">
              <p className="mb-4">TODO: Tableau des commandes</p>
              <ul className="text-sm space-y-1">
                <li>• Colonnes: N° commande, Client, Produits, Total, Statut paiement, Statut expédition, Date, Actions</li>
                <li>• Filtres: Statut (en attente/payée/expédiée/livrée), Période, Produit</li>
                <li>• Actions: Voir détails, Marquer comme expédiée, Générer étiquette, Rembourser</li>
                <li>• Supabase query: SELECT * FROM orders avec joins sur users et order_items</li>
                <li>• Intégration avec système d'étiquettes d'expédition (shipping_labels table)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
