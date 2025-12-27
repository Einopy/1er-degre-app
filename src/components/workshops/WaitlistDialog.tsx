import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { createWaitlistEntry, type WaitlistFormData } from '@/services/waitlist';
import { Loader2 } from 'lucide-react';

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WaitlistDialog({ open, onOpenChange }: WaitlistDialogProps) {
  const [formData, setFormData] = useState<WaitlistFormData>({
    email: '',
    workshopFamily: 'FDFP',
    city: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<WaitlistFormData>>({});
  const { toast } = useToast();

  const validateForm = (): boolean => {
    const newErrors: Partial<WaitlistFormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.city) {
      newErrors.city = 'Ville requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createWaitlistEntry(formData);

      if (result.success) {
        toast({
          title: 'Inscription réussie !',
          description:
            'Nous vous contacterons dès qu\'un atelier correspondant à vos critères sera disponible.',
        });

        setFormData({
          email: '',
          workshopFamily: 'FDFP',
          city: '',
        });
        setErrors({});
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description:
            result.error || 'Une erreur est survenue. Veuillez réessayer.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue. Veuillez réessayer.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rejoindre la liste d'attente</DialogTitle>
          <DialogDescription>
            Aucun atelier ne correspond à vos critères actuellement. Laissez-nous vos coordonnées
            et nous vous préviendrons dès qu'un atelier correspondant sera disponible dans un
            rayon de 35 km.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="waitlist-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="waitlist-email"
              type="email"
              placeholder="votre@email.fr"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Type d'atelier <span className="text-destructive">*</span>
            </Label>
            <RadioGroup
              value={formData.workshopFamily}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  workshopFamily: value as 'FDFP' | 'HD',
                })
              }
              disabled={isSubmitting}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FDFP" id="waitlist-fdfp" />
                <Label htmlFor="waitlist-fdfp" className="font-normal cursor-pointer">
                  FDFP - Formation du Faire ensemble
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="HD" id="waitlist-hd" />
                <Label htmlFor="waitlist-hd" className="font-normal cursor-pointer">
                  HD - Heure Déclic
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="waitlist-city">
              Ville <span className="text-destructive">*</span>
            </Label>
            <Input
              id="waitlist-city"
              placeholder="Ex: Lyon, Paris..."
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              disabled={isSubmitting}
            />
            {errors.city && (
              <p className="text-sm text-destructive">{errors.city}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Nous rechercherons des ateliers dans un rayon de 35 km autour de cette ville.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inscription...
                </>
              ) : (
                'M\'inscrire'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
