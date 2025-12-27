export interface ClassificationChoice {
  audience: 'grand_public' | 'pro';
  organization?: 'association' | 'entreprise' | 'enseignement' | 'pouvoir_public';
  subAudience?: 'profs' | 'etudiants_alumnis' | 'elus' | 'agents';
  situation?: 'internal' | 'external';
}

export interface ClassificationResult {
  status: string;
  defaultPrice: number;
  label: string;
}

const CLASSIFICATION_MAP: Record<string, ClassificationResult> = {
  'grand_public': {
    status: 'benevole_grand_public',
    defaultPrice: 12,
    label: 'Grand Public - Bénévole',
  },
  'pro_association_internal': {
    status: 'interne_asso',
    defaultPrice: 8,
    label: 'Association - Interne',
  },
  'pro_association_external': {
    status: 'externe_asso',
    defaultPrice: 8,
    label: 'Association - Prestataire externe',
  },
  'pro_entreprise_internal': {
    status: 'interne_entreprise',
    defaultPrice: 12,
    label: 'Entreprise - Interne',
  },
  'pro_entreprise_external': {
    status: 'externe_entreprise',
    defaultPrice: 12,
    label: 'Entreprise - Prestataire externe',
  },
  'pro_enseignement_profs_internal': {
    status: 'interne_profs',
    defaultPrice: 8,
    label: 'Enseignement - Professeurs - Interne',
  },
  'pro_enseignement_profs_external': {
    status: 'externe_profs',
    defaultPrice: 8,
    label: 'Enseignement - Professeurs - Prestataire externe',
  },
  'pro_enseignement_etudiants_alumnis_internal': {
    status: 'interne_etudiants_alumnis',
    defaultPrice: 0,
    label: 'Enseignement - Étudiants/Alumnis - Interne',
  },
  'pro_enseignement_etudiants_alumnis_external': {
    status: 'externe_etudiants_alumnis',
    defaultPrice: 4,
    label: 'Enseignement - Étudiants/Alumnis - Prestataire externe',
  },
  'pro_pouvoir_public_elus_internal': {
    status: 'interne_elus',
    defaultPrice: 8,
    label: 'Pouvoir Public - Élus - Interne',
  },
  'pro_pouvoir_public_elus_external': {
    status: 'externe_elus',
    defaultPrice: 8,
    label: 'Pouvoir Public - Élus - Prestataire externe',
  },
  'pro_pouvoir_public_agents_internal': {
    status: 'interne_agents',
    defaultPrice: 8,
    label: 'Pouvoir Public - Agents - Interne',
  },
  'pro_pouvoir_public_agents_external': {
    status: 'externe_agents',
    defaultPrice: 8,
    label: 'Pouvoir Public - Agents - Prestataire externe',
  },
};

export function resolveClassification(choice: ClassificationChoice): ClassificationResult | null {
  if (choice.audience === 'grand_public') {
    return CLASSIFICATION_MAP['grand_public'];
  }

  if (choice.audience === 'pro' && choice.organization && choice.situation) {
    let key = `pro_${choice.organization}_${choice.situation}`;

    if (choice.organization === 'enseignement' || choice.organization === 'pouvoir_public') {
      if (!choice.subAudience) return null;
      key = `pro_${choice.organization}_${choice.subAudience}_${choice.situation}`;
    }

    return CLASSIFICATION_MAP[key] || null;
  }

  return null;
}

export function isClassificationComplete(choice: ClassificationChoice): boolean {
  if (choice.audience === 'grand_public') {
    return true;
  }

  if (choice.audience === 'pro') {
    if (!choice.organization || !choice.situation) return false;

    if (choice.organization === 'enseignement' || choice.organization === 'pouvoir_public') {
      return !!choice.subAudience;
    }

    return true;
  }

  return false;
}
