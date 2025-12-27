import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { WorkshopLocation } from '@/lib/database.types';

interface LocationFieldsGroupProps {
  location: WorkshopLocation | null;
  onChange: (location: WorkshopLocation) => void;
  disabled?: boolean;
}

export function LocationFieldsGroup({
  location,
  onChange,
  disabled = false,
}: LocationFieldsGroupProps) {
  const handleChange = (field: keyof WorkshopLocation, value: string) => {
    const updatedLocation: WorkshopLocation = {
      venue_name: location?.venue_name || '',
      street: location?.street || '',
      street2: location?.street2 || '',
      city: location?.city || '',
      postal_code: location?.postal_code || '',
      region: location?.region || '',
      country: location?.country || 'France',
      [field]: value,
    };
    onChange(updatedLocation);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="venue-name">
          Lieu-dit<span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          id="venue-name"
          value={location?.venue_name || ''}
          onChange={(e) => handleChange('venue_name', e.target.value)}
          placeholder="Nom du lieu (ex: Salle des Fêtes)"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="street">
          Adresse<span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          id="street"
          value={location?.street || ''}
          onChange={(e) => handleChange('street', e.target.value)}
          placeholder="Rue et numéro"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="street2">Complément d'adresse</Label>
        <Input
          id="street2"
          value={location?.street2 || ''}
          onChange={(e) => handleChange('street2', e.target.value)}
          placeholder="Bâtiment, étage, etc."
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postal-code">
            Code postal<span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="postal-code"
            value={location?.postal_code || ''}
            onChange={(e) => handleChange('postal_code', e.target.value)}
            placeholder="75001"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">
            Ville<span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            id="city"
            value={location?.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Paris"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="region">Région</Label>
        <Input
          id="region"
          value={location?.region || ''}
          onChange={(e) => handleChange('region', e.target.value)}
          placeholder="Île-de-France"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">
          Pays<span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          id="country"
          value={location?.country || 'France'}
          onChange={(e) => handleChange('country', e.target.value)}
          placeholder="France"
          disabled={disabled}
        />
      </div>
    </div>
  );
}
