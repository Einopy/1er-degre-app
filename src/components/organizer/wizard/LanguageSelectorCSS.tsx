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
  onChange?: (value: LanguageCode) => void;
  onValueChange?: (value: LanguageCode) => void;
  className?: string;
}

export function LanguageSelectorCSS({ value, onChange, onValueChange, className }: LanguageSelectorProps) {
  const handleChange = (val: LanguageCode) => {
    onChange?.(val);
    onValueChange?.(val);
  };
  return (
    <div className={cn('', className)}>
      <TooltipProvider>
        <RadioGroup
          value={value}
          onValueChange={handleChange}
          className="flex items-center gap-6"
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
                      'flex items-center justify-center w-12 h-12 rounded-full cursor-pointer transition-all overflow-hidden bg-transparent',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  'hover:scale-110',
                      value === language.code
                        ? 'opacity-100 shadow-lg'
                        : 'opacity-40 grayscale'
                    )}
                    tabIndex={0}
                    role="radio"
                    aria-checked={value === language.code}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleChange(language.code);
                      }
                    }}
                  >
                    <span
                      className={cn('fi w-full h-full flex items-center justify-center', `fi-${language.flagCode}`)}
                      style={{
                        fontSize: '2.5rem',
                        lineHeight: '1',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                      aria-hidden="true"
                    />
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent className="scale-[1.333]">
                <p>{language.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </RadioGroup>
      </TooltipProvider>
    </div>
  );
}
