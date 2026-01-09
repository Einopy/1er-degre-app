import type { QuestCardData } from '@/hooks/use-journey-data';
import { QuestCardObtained } from './QuestCardObtained';
import { QuestCardNext } from './QuestCardNext';
import { QuestCardLocked } from './QuestCardLocked';

// Thèmes de couleurs par niveau
export const LEVEL_THEMES = {
  1: { // Animateur
    bg: 'bg-emerald-50',
    border: 'border-emerald-500',
    borderLight: 'border-emerald-200',
    text: 'text-emerald-700',
    textLight: 'text-emerald-600',
    icon: 'bg-emerald-500',
    iconText: 'text-emerald-500',
    gradient: 'from-emerald-50 to-emerald-100',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  2: { // Pro
    bg: 'bg-blue-50',
    border: 'border-blue-500',
    borderLight: 'border-blue-200',
    text: 'text-blue-700',
    textLight: 'text-blue-600',
    icon: 'bg-blue-500',
    iconText: 'text-blue-500',
    gradient: 'from-blue-50 to-blue-100',
    badge: 'bg-blue-100 text-blue-800',
  },
  3: { // Formateur
    bg: 'bg-purple-50',
    border: 'border-purple-500',
    borderLight: 'border-purple-200',
    text: 'text-purple-700',
    textLight: 'text-purple-600',
    icon: 'bg-purple-500',
    iconText: 'text-purple-500',
    gradient: 'from-purple-50 to-purple-100',
    badge: 'bg-purple-100 text-purple-800',
  },
  4: { // Instructeur
    bg: 'bg-amber-50',
    border: 'border-amber-500',
    borderLight: 'border-amber-200',
    text: 'text-amber-700',
    textLight: 'text-amber-600',
    icon: 'bg-amber-500',
    iconText: 'text-amber-500',
    gradient: 'from-amber-50 to-amber-100',
    badge: 'bg-amber-100 text-amber-800',
  },
} as const;

export type LevelTheme = typeof LEVEL_THEMES[keyof typeof LEVEL_THEMES];

export function getThemeForLevel(level: number): LevelTheme {
  return LEVEL_THEMES[level as keyof typeof LEVEL_THEMES] || LEVEL_THEMES[1];
}

interface QuestCardProps {
  questCard: QuestCardData;
  familyCode: string;
}

export function QuestCard({ questCard, familyCode }: QuestCardProps) {
  const theme = getThemeForLevel(questCard.roleLevel.level);

  switch (questCard.status) {
    case 'obtained':
      return <QuestCardObtained questCard={questCard} theme={theme} />;
    case 'next':
      return <QuestCardNext questCard={questCard} theme={theme} familyCode={familyCode} />;
    case 'locked':
      return <QuestCardLocked questCard={questCard} theme={theme} />;
    default:
      return null;
  }
}
