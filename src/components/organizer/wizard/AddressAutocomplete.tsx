import { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  }) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelected,
  id,
  placeholder,
  disabled,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const handlePlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (!place || !place.address_components) {
      console.log('No place data received');
      return;
    }

    const addressComponents = place.address_components;
    let street = '';
    let city = '';
    let postalCode = '';
    let country = 'FR';

    const streetNumber = addressComponents.find((c) =>
      c.types.includes('street_number')
    )?.long_name;
    const route = addressComponents.find((c) =>
      c.types.includes('route')
    )?.long_name;

    if (streetNumber && route) {
      street = `${streetNumber} ${route}`;
    } else if (route) {
      street = route;
    }

    const cityComponent = addressComponents.find(
      (c) =>
        c.types.includes('locality') || c.types.includes('postal_town')
    );
    if (cityComponent) {
      city = cityComponent.long_name;
    }

    const postalComponent = addressComponents.find((c) =>
      c.types.includes('postal_code')
    );
    if (postalComponent) {
      postalCode = postalComponent.long_name;
    }

    const countryComponent = addressComponents.find((c) =>
      c.types.includes('country')
    );
    if (countryComponent) {
      country = countryComponent.short_name;
    }

    onChange(street);
    onPlaceSelected({
      street,
      city,
      postalCode,
      country,
    });
  }, [onChange, onPlaceSelected]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      setError('Google Maps API key non configurée');
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const initializeAutocomplete = async () => {
      try {
        setOptions({
          apiKey,
          version: 'weekly',
        } as any);

        await importLibrary('places');

        if (!mounted || !inputRef.current) {
          setIsLoading(false);
          return;
        }

        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: ['fr', 'be', 'ch', 'lu', 'ca'] },
          fields: ['address_components', 'formatted_address', 'geometry'],
        });

        listenerRef.current = autocompleteRef.current.addListener('place_changed', handlePlaceChanged);

        if (mounted) {
          setIsLoading(false);
          setError(null);
        }
      } catch (err: unknown) {
        console.error('Error initializing autocomplete:', err);
        if (mounted) {
          setError('Erreur d\'initialisation de l\'autocomplétion');
          setIsLoading(false);
        }
      }
    };

    initializeAutocomplete();

    return () => {
      mounted = false;
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
      }
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [handlePlaceChanged]);

  if (error) {
    return (
      <div className="space-y-2">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
        <Alert variant="default" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {error}. Veuillez saisir l'adresse manuellement.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isLoading}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && !error && (
        <p className="text-xs text-muted-foreground mt-1">
          Commencez à taper pour voir les suggestions d'adresse
        </p>
      )}
    </div>
  );
}
