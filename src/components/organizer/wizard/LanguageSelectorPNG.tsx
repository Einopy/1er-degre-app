import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type LanguageCode = 'fr' | 'en' | 'de' | 'zh';

interface Language {
  code: LanguageCode;
  name: string;
  flagUrl: string;
}

const LANGUAGES: Language[] = [
  { code: 'fr', name: 'Français', flagUrl: 'https://flagcdn.com/w80/fr.png' },
  { code: 'en', name: 'English', flagUrl: 'https://flagcdn.com/w80/gb.png' },
  { code: 'de', name: 'Deutsch', flagUrl: 'https://flagcdn.com/w80/de.png' },
  { code: 'zh', name: '中文', flagUrl: 'https://flagcdn.com/w80/cn.png' },
];

interface LanguageSelectorProps {
  value: LanguageCode;
  onValueChange: (value: LanguageCode) => void;
  className?: string;
}

export function LanguageSelectorPNG({ value, onValueChange, className }: LanguageSelectorProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-base font-semibold" id="language-selector-label">
        Langue de l'atelier
        <span className="text-destructive ml-1">*</span>
      </Label>
      <TooltipProvider>
        <RadioGroup
          value={value}
          onValueChange={onValueChange}
          className="flex items-center gap-3"
          aria-labelledby="language-selector-label"
        >
          {LANGUAGES.map((language) => (
            <Tooltip key={language.code}>
              <TooltipTrigger asChild>
                <div>
                  <RadioGroupItem
                    value={language.code}
                    id={`lang-${language.code}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`lang-${language.code}`}
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-full cursor-pointer transition-all overflow-hidden',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'hover:scale-110 border-2 border-transparent bg-muted',
                      value === language.code
                        ? 'scale-100 opacity-100 border-primary shadow-lg'
                        : 'scale-90 opacity-40 grayscale'
                    )}
                    tabIndex={0}
                    role="radio"
                    aria-checked={value === language.code}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onValueChange(language.code);
                      }
                    }}
                  >
                    <img
                      src={language.flagUrl}
                      alt={`${language.name} flag`}
                      className="w-full h-full object-cover rounded-full"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{language.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </RadioGroup>
      </TooltipProvider>
    </div>
  );
}
