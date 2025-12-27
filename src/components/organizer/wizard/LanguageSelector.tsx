import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import 'flag-icons/css/flag-icons.min.css';

export type LanguageCode = 'fr' | 'en' | 'de' | 'zh';

interface Language {
  code: LanguageCode;
  name: string;
  flagCode: string;
}

const LANGUAGES: Language[] = [
  { code: 'fr', name: 'Français', flagCode: 'fr' },
  { code: 'en', name: 'English', flagCode: 'gb' },
  { code: 'de', name: 'Deutsch', flagCode: 'de' },
  { code: 'zh', name: '中文', flagCode: 'cn' },
];

interface LanguageSelectorProps {
  value: LanguageCode;
  onValueChange: (value: LanguageCode) => void;
  className?: string;
}

export function LanguageSelector({ value, onValueChange, className }: LanguageSelectorProps) {
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
          className="flex items-center gap-10"
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
                      'flex items-center justify-center w-12 h-12 rounded-full cursor-pointer transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      'hover:scale-110',
                      value === language.code
                        ? 'scale-100 opacity-100'
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
                    <span
                      className={cn('fi rounded-full w-10 h-10 flex items-center justify-center text-3xl shadow-sm', `fi-${language.flagCode}`)}
                      aria-hidden="true"
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
