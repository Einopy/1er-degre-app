import { useState } from 'react';
import { AnimatedTabs, AnimatedTabsContent, AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
import { Settings, Package, Shield, Languages } from 'lucide-react';
import { AdminConfigFamiliesTab } from './AdminConfigFamiliesTab';

export function AdminConfigTab() {
  const [activeSubTab, setActiveSubTab] = useState('families');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuration</h2>
        <p className="text-muted-foreground">
          Configurez les familles d'ateliers, types, rôles et langues pour votre organisation
        </p>
      </div>

      <AnimatedTabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <AnimatedTabsList>
          <AnimatedTabsTrigger value="families">
            <Package className="h-4 w-4 mr-2" />
            Familles d'ateliers
          </AnimatedTabsTrigger>
          <AnimatedTabsTrigger value="types">
            <Settings className="h-4 w-4 mr-2" />
            Types d'ateliers
          </AnimatedTabsTrigger>
          <AnimatedTabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-2" />
            Rôles & Parcours
          </AnimatedTabsTrigger>
          <AnimatedTabsTrigger value="languages">
            <Languages className="h-4 w-4 mr-2" />
            Langues
          </AnimatedTabsTrigger>
        </AnimatedTabsList>

        <AnimatedTabsContent value="families">
          <AdminConfigFamiliesTab />
        </AnimatedTabsContent>

        <AnimatedTabsContent value="types">
          <div className="text-center py-12 text-muted-foreground">
            Configuration des types d'ateliers - À implémenter
          </div>
        </AnimatedTabsContent>

        <AnimatedTabsContent value="roles">
          <div className="text-center py-12 text-muted-foreground">
            Configuration des rôles et parcours - À implémenter
          </div>
        </AnimatedTabsContent>

        <AnimatedTabsContent value="languages">
          <div className="text-center py-12 text-muted-foreground">
            Configuration des langues - À implémenter
          </div>
        </AnimatedTabsContent>
      </AnimatedTabs>
    </div>
  );
}
