# Workshop Wizard Implementation Options

This document explains how to switch between different implementation options for the Workshop Wizard components.

## Language Selector Options

You have two implementation options for the language selector:

### Option A: CSS Flag Icons (Current Default)
- File: `LanguageSelector.tsx` (original)
- Uses: `flag-icons` CSS library
- Pros: Lightweight, no external image requests
- Cons: Limited styling flexibility

### Option B: CSS Flag Icons (Enhanced)
- File: `LanguageSelectorCSS.tsx`
- Uses: `flag-icons` CSS library with improved styling
- Pros: Better visual fill of circular containers
- Cons: Still limited by CSS library constraints

### Option C: PNG Flag Images
- File: `LanguageSelectorPNG.tsx`
- Uses: Direct PNG images from flagcdn.com CDN
- Pros: Perfect circular flags, better visual quality
- Cons: External image requests, slight loading delay

**To switch:**
1. Open `BrandLanguageStep.tsx`
2. Change the import statement from:
   ```typescript
   import { LanguageSelector } from './LanguageSelector';
   ```
   To one of:
   ```typescript
   import { LanguageSelectorCSS as LanguageSelector } from './LanguageSelectorCSS';
   // OR
   import { LanguageSelectorPNG as LanguageSelector } from './LanguageSelectorPNG';
   ```

## Calendar Options

You have two implementation options for the calendar:

### Option A: Library-Based Calendar
- File: `calendar-library.tsx`
- Uses: `react-day-picker` library with custom styling
- Pros: Well-tested library, accessible, handles edge cases
- Cons: Larger bundle size

### Option B: Custom Calendar
- File: `calendar-custom.tsx`
- Uses: Fully custom implementation from scratch
- Pros: Smaller bundle size, complete control
- Cons: Need to handle all edge cases manually

**To switch:**
1. Open `DateTimePicker.tsx` (or create DateTimePickerCustom.tsx / DateTimePickerLibrary.tsx)
2. Change the import statement from:
   ```typescript
   import { Calendar } from '@/components/ui/calendar';
   ```
   To one of:
   ```typescript
   import { CalendarLibrary as Calendar } from '@/components/ui/calendar-library';
   // OR
   import { CalendarCustom as Calendar } from '@/components/ui/calendar-custom';
   ```

### Pre-configured DateTimePicker Options

For easier switching, two complete DateTimePicker components are provided:

- `DateTimePickerLibrary.tsx` - Uses the library-based calendar
- `DateTimePickerCustom.tsx` - Uses the custom calendar

**To switch:**
1. Open `ScheduleStep.tsx`
2. Change the import statement from:
   ```typescript
   import { DateTimePicker } from './DateTimePicker';
   ```
   To one of:
   ```typescript
   import { DateTimePickerLibrary as DateTimePicker } from './DateTimePickerLibrary';
   // OR
   import { DateTimePickerCustom as DateTimePicker } from './DateTimePickerCustom';
   ```

## Current Active Configuration

By default, the following options are active:
- **Language Selector**: Original CSS flag icons (`LanguageSelector.tsx`)
- **Calendar**: Original shadcn/ui calendar (`calendar.tsx` via `DateTimePicker.tsx`)

## Testing Different Options

To test different combinations:

1. Make the desired import changes in the respective files
2. Run `npm run build` to ensure no TypeScript errors
3. Test the visual appearance and functionality
4. Choose the combination that best fits your needs

## Recommendations

### For Production Use
- **Language Selector**: PNG version for best visual quality
- **Calendar**: Library version for reliability and accessibility

### For Minimal Bundle Size
- **Language Selector**: CSS version
- **Calendar**: Custom version

### For Best Balance
- **Language Selector**: CSS Enhanced version
- **Calendar**: Library version
