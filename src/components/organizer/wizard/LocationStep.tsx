import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Monitor, MapPin, AlertCircle } from 'lucide-react';
import type { WorkshopWizardData } from '@/lib/workshop-wizard-types';
import { AddressAutocomplete } from './AddressAutocomplete';

interface LocationStepProps {
  form: UseFormReturn<WorkshopWizardData>;
  validationError?: string;
}

export function LocationStep({ form, validationError }: LocationStepProps) {
  const { watch, setValue, register, formState: { errors } } = form;
  const isRemote = watch('is_remote');

  const handleModeChange = (value: string) => {
    const remote = value === 'remote';
    setValue('is_remote', remote);

    if (remote) {
      setValue('location', undefined);
    } else {
      setValue('visio_link', undefined);
      setValue('mural_link', undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-semibold">Mode de l'atelier</Label>
        <RadioGroup
          value={isRemote ? 'remote' : 'in-person'}
          onValueChange={handleModeChange}
          className="grid grid-cols-2 gap-4"
        >
          <div>
            <RadioGroupItem value="in-person" id="in-person" className="peer sr-only" />
            <Label
              htmlFor="in-person"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
            >
              <MapPin className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">Présentiel</span>
              <span className="text-sm text-muted-foreground text-center mt-1">
                Atelier en personne
              </span>
            </Label>
          </div>
          <div>
            <RadioGroupItem value="remote" id="remote" className="peer sr-only" />
            <Label
              htmlFor="remote"
              className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
            >
              <Monitor className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">À distance</span>
              <span className="text-sm text-muted-foreground text-center mt-1">
                Atelier en ligne
              </span>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {isRemote ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visio-link">
              Lien de visioconférence
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="visio-link"
              type="url"
              {...register('visio_link', {
                required: isRemote ? 'Le lien de visioconférence est requis pour un atelier à distance' : false,
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: 'Veuillez entrer une URL valide'
                }
              })}
              placeholder="https://zoom.us/j/..."
            />
            {errors.visio_link && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.visio_link.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mural-link">Lien Mural (optionnel)</Label>
            <Input
              id="mural-link"
              type="url"
              {...register('mural_link', {
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: 'Veuillez entrer une URL valide'
                }
              })}
              placeholder="https://app.mural.co/..."
            />
            {errors.mural_link && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.mural_link.message}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="venue-name">
              Nom du lieu
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="venue-name"
              {...register('location.venue_name', {
                required: !isRemote ? 'Le nom du lieu est requis' : false
              })}
              placeholder="Ex: Maison des associations"
            />
            {errors.location?.venue_name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.location.venue_name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">
              Adresse
              <span className="text-destructive ml-1">*</span>
            </Label>
            <AddressAutocomplete
              id="street"
              value={watch('location.street') || ''}
              onChange={(value) => setValue('location.street', value)}
              onPlaceSelected={(place) => {
                setValue('location.street', place.street);
                setValue('location.city', place.city);
                setValue('location.postal_code', place.postalCode);
                setValue('location.country', place.country);
              }}
              placeholder="Ex: 15 rue de la République"
              disabled={isRemote}
            />
            {errors.location?.street && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.location.street.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="street2">Complément d'adresse (optionnel)</Label>
            <Input
              id="street2"
              {...register('location.street2')}
              placeholder="Ex: Bâtiment B, 2ème étage"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal-code">
                Code postal
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="postal-code"
                {...register('location.postal_code', {
                  required: !isRemote ? 'Le code postal est requis' : false
                })}
                placeholder="75001"
              />
              {errors.location?.postal_code && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.location.postal_code.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">
                Ville
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="city"
                {...register('location.city', {
                  required: !isRemote ? 'La ville est requise' : false
                })}
                placeholder="Paris"
              />
              {errors.location?.city && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.location.city.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input
              id="country"
              {...register('location.country')}
              defaultValue="FR"
              placeholder="FR"
            />
            <p className="text-sm text-muted-foreground">
              Code pays ISO (2 lettres)
            </p>
          </div>
        </div>
      )}

      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
