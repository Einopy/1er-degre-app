import { useState, useEffect } from 'react';
import { useActiveClient } from '@/hooks/use-active-client';
import { useRoleLevels, useWorkshopTypes, useWorkshopFamilies } from '@/hooks/use-client-config';
import type { RoleLevel } from '@/lib/database.types';
import {
  updateRoleLevel,
  upsertRoleRequirements,
  fetchRoleRequirements,
} from '@/services/client-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { ChevronDown, Save, Shield } from 'lucide-react';

const LEVEL_COLORS = {
  1: 'bg-blue-500',
  2: 'bg-green-500',
  3: 'bg-purple-500',
  4: 'bg-orange-500',
};

const LEVEL_TEXT_COLORS = {
  1: 'text-blue-600',
  2: 'text-green-600',
  3: 'text-purple-600',
  4: 'text-orange-600',
};

interface RoleLevelForm {
  role: RoleLevel;
  label: string;
  description: string | null;
  requirements: {
    required_workshop_type_ids: string[];
    min_workshops_total: number;
    min_workshops_online: number;
    min_workshops_in_person: number;
    min_feedback_count: number;
    min_feedback_avg: number;
  };
}

export function AdminConfigRolesTab() {
  const { activeClient } = useActiveClient();
  const { families, loading: loadingFamilies } = useWorkshopFamilies(activeClient?.id);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const { roleLevels, loading: loadingRoles, refetch } = useRoleLevels(activeClient?.id, selectedFamilyId || undefined);
  const { types: allTypes, loading: loadingTypes } = useWorkshopTypes(activeClient?.id);
  const { toast } = useToast();

  const [forms, setForms] = useState<Record<string, RoleLevelForm>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const formationTypes = allTypes.filter(t => t.is_formation);

  useEffect(() => {
    if (families.length > 0 && !selectedFamilyId) {
      setSelectedFamilyId(families[0].id);
    }
  }, [families, selectedFamilyId]);

  useEffect(() => {
    const loadRequirements = async () => {
      if (roleLevels.length === 0) return;

      const newForms: Record<string, RoleLevelForm> = {};

      for (const role of roleLevels) {
        try {
          const requirements = await fetchRoleRequirements(role.id);

          const requiredTypes = requirements?.required_workshop_types
            ? (Array.isArray(requirements.required_workshop_types)
                ? requirements.required_workshop_types as string[]
                : [])
            : [];

          newForms[role.id] = {
            role,
            label: role.label,
            description: role.description,
            requirements: {
              required_workshop_type_ids: requiredTypes,
              min_workshops_total: requirements?.min_workshops_total || 0,
              min_workshops_online: requirements?.min_workshops_online || 0,
              min_workshops_in_person: requirements?.min_workshops_in_person || 0,
              min_feedback_count: requirements?.min_feedback_count || 0,
              min_feedback_avg: requirements?.min_feedback_avg || 0,
            },
          };
        } catch (error) {
          console.error(`Error loading requirements for role ${role.id}:`, error);
          newForms[role.id] = {
            role,
            label: role.label,
            description: role.description,
            requirements: {
              required_workshop_type_ids: [],
              min_workshops_total: 0,
              min_workshops_online: 0,
              min_workshops_in_person: 0,
              min_feedback_count: 0,
              min_feedback_avg: 0,
            },
          };
        }
      }

      setForms(newForms);
    };

    loadRequirements();
  }, [roleLevels]);

  const handleSave = async (roleId: string) => {
    const form = forms[roleId];
    if (!form) return;

    try {
      setSaving(prev => ({ ...prev, [roleId]: true }));

      await updateRoleLevel(roleId, {
        label: form.label,
        description: form.description,
      });

      await upsertRoleRequirements({
        role_level_id: roleId,
        required_workshop_types: form.requirements.required_workshop_type_ids as any,
        min_workshops_total: form.requirements.min_workshops_total,
        min_workshops_online: form.requirements.min_workshops_online,
        min_workshops_in_person: form.requirements.min_workshops_in_person,
        min_feedback_count: form.requirements.min_feedback_count,
        min_feedback_avg: form.requirements.min_feedback_avg,
        custom_rules: null,
      });

      toast({
        title: 'Rôle mis à jour',
        description: `Le rôle "${form.label}" a été mis à jour avec succès.`,
      });

      refetch();
    } catch (error) {
      console.error('Error saving role:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de l\'enregistrement.',
        variant: 'destructive',
      });
    } finally {
      setSaving(prev => ({ ...prev, [roleId]: false }));
    }
  };

  const updateForm = (roleId: string, updates: Partial<RoleLevelForm>) => {
    setForms(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        ...updates,
      },
    }));
  };

  const updateRequirements = (roleId: string, updates: Partial<RoleLevelForm['requirements']>) => {
    setForms(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        requirements: {
          ...prev[roleId].requirements,
          ...updates,
        },
      },
    }));
  };

  const toggleTraining = (roleId: string, trainingId: string) => {
    const form = forms[roleId];
    if (!form) return;

    const currentTrainings = form.requirements.required_workshop_type_ids;
    const newTrainings = currentTrainings.includes(trainingId)
      ? currentTrainings.filter(id => id !== trainingId)
      : [...currentTrainings, trainingId];

    updateRequirements(roleId, { required_workshop_type_ids: newTrainings });
  };

  if (loadingFamilies || loadingRoles || loadingTypes) {
    return <LoadingSpinner />;
  }

  if (families.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Aucune famille d'ateliers configurée. Créez d'abord une famille dans l'onglet "Familles d'ateliers".
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rôles & Parcours d'Animation</CardTitle>
          <CardDescription>
            Configurez les 4 niveaux de rôles d'animation et leurs prérequis pour chaque famille d'ateliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="family-select">Famille d'ateliers</Label>
            <Select value={selectedFamilyId || ''} onValueChange={setSelectedFamilyId}>
              <SelectTrigger id="family-select" className="w-64">
                <SelectValue placeholder="Sélectionner une famille" />
              </SelectTrigger>
              <SelectContent>
                {families.map(family => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {roleLevels.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun rôle configuré pour cette famille
            </p>
          ) : (
            <div className="space-y-6">
              {roleLevels.map(role => {
                const form = forms[role.id];
                if (!form) return null;

                return (
                  <Card key={role.id} className="border-2">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={`${LEVEL_COLORS[role.level as keyof typeof LEVEL_COLORS]} text-white`}>
                            Niveau {role.level}
                          </Badge>
                          <CardTitle className={`text-xl ${LEVEL_TEXT_COLORS[role.level as keyof typeof LEVEL_TEXT_COLORS]}`}>
                            {form.label}
                          </CardTitle>
                        </div>
                        <Badge variant="outline">{role.internal_key}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor={`label-${role.id}`}>Label du rôle *</Label>
                          <Input
                            id={`label-${role.id}`}
                            value={form.label}
                            onChange={(e) => updateForm(role.id, { label: e.target.value })}
                            placeholder="ex: Animateur, Facilitateur, etc."
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`description-${role.id}`}>Description</Label>
                          <Textarea
                            id={`description-${role.id}`}
                            value={form.description || ''}
                            onChange={(e) => updateForm(role.id, { description: e.target.value })}
                            placeholder="Description du rôle (optionnel)"
                            rows={2}
                          />
                        </div>
                      </div>

                      <Collapsible className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span className="font-medium">Prérequis pour obtenir ce rôle</span>
                          </div>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="p-4 pt-0 space-y-4">
                          <div className="grid gap-4">
                            {formationTypes.length > 0 && (
                              <div className="grid gap-2">
                                <Label>Formations requises</Label>
                                <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                                  {formationTypes.map(type => (
                                    <div key={type.id} className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id={`training-${role.id}-${type.id}`}
                                        checked={form.requirements.required_workshop_type_ids.includes(type.id)}
                                        onChange={() => toggleTraining(role.id, type.id)}
                                        className="rounded border-gray-300"
                                      />
                                      <Label
                                        htmlFor={`training-${role.id}-${type.id}`}
                                        className="cursor-pointer font-normal"
                                      >
                                        {type.label}
                                      </Label>
                                    </div>
                                  ))}
                                  {formationTypes.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                      Aucune formation disponible
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor={`min-total-${role.id}`}>
                                  Minimum d'ateliers total
                                </Label>
                                <Input
                                  id={`min-total-${role.id}`}
                                  type="number"
                                  min="0"
                                  value={form.requirements.min_workshops_total}
                                  onChange={(e) =>
                                    updateRequirements(role.id, {
                                      min_workshops_total: parseInt(e.target.value) || 0,
                                    })
                                  }
                                />
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor={`min-online-${role.id}`}>
                                  Minimum d'ateliers en ligne
                                </Label>
                                <Input
                                  id={`min-online-${role.id}`}
                                  type="number"
                                  min="0"
                                  value={form.requirements.min_workshops_online}
                                  onChange={(e) =>
                                    updateRequirements(role.id, {
                                      min_workshops_online: parseInt(e.target.value) || 0,
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="grid gap-2">
                                <Label htmlFor={`min-person-${role.id}`}>
                                  Minimum d'ateliers en présentiel
                                </Label>
                                <Input
                                  id={`min-person-${role.id}`}
                                  type="number"
                                  min="0"
                                  value={form.requirements.min_workshops_in_person}
                                  onChange={(e) =>
                                    updateRequirements(role.id, {
                                      min_workshops_in_person: parseInt(e.target.value) || 0,
                                    })
                                  }
                                />
                              </div>

                              <div className="grid gap-2">
                                <Label htmlFor={`min-feedback-${role.id}`}>
                                  Minimum de feedbacks reçus
                                </Label>
                                <Input
                                  id={`min-feedback-${role.id}`}
                                  type="number"
                                  min="0"
                                  value={form.requirements.min_feedback_count}
                                  onChange={(e) =>
                                    updateRequirements(role.id, {
                                      min_feedback_count: parseInt(e.target.value) || 0,
                                    })
                                  }
                                />
                              </div>
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor={`min-avg-${role.id}`}>
                                Score moyen minimum des feedbacks (0-5)
                              </Label>
                              <Input
                                id={`min-avg-${role.id}`}
                                type="number"
                                min="0"
                                max="5"
                                step="0.1"
                                value={form.requirements.min_feedback_avg}
                                onChange={(e) =>
                                  updateRequirements(role.id, {
                                    min_feedback_avg: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      <div className="flex justify-end pt-2">
                        <Button
                          onClick={() => handleSave(role.id)}
                          disabled={saving[role.id]}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {saving[role.id] ? 'Enregistrement...' : 'Enregistrer'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
