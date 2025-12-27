import { useState } from 'react';
import { User } from '@/lib/database.types';
import { updateUserRoles } from '@/services/admin';
import { WorkshopPermission } from '@/lib/organizer-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface UserEditDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

const SYSTEM_ROLES = [
  { value: 'participant', label: 'Participant', description: 'Can register for workshops' },
  { value: 'admin', label: 'Admin', description: 'Full system access' },
];

const FDFP_PERMISSIONS: { value: WorkshopPermission; label: string; description: string }[] = [
  { value: 'FDFP_public', label: 'Grand Public', description: 'Animate public FDFP workshops' },
  { value: 'FDFP_pro', label: 'Professionnel', description: 'Animate professional FDFP workshops' },
  { value: 'FDFP_trainer', label: 'Formateur', description: 'Lead FDFP training courses' },
];

const HD_PERMISSIONS: { value: WorkshopPermission; label: string; description: string }[] = [
  { value: 'HD_public', label: 'Grand Public', description: 'Animate public HD workshops' },
  { value: 'HD_pro', label: 'Professionnel', description: 'Animate professional HD workshops' },
  { value: 'HD_trainer', label: 'Formateur', description: 'Lead HD training courses' },
];

export function UserEditDialog({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}: UserEditDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user?.roles || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleToggle = (role: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, role]);
    } else {
      setSelectedRoles(selectedRoles.filter(r => r !== role));
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    try {
      setIsSubmitting(true);
      await updateUserRoles(user.id, selectedRoles);

      toast({
        title: 'User updated',
        description: `Roles updated for ${user.first_name} ${user.last_name}`,
      });

      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update user roles',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User Roles</DialogTitle>
          <DialogDescription>
            {user.first_name} {user.last_name} ({user.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-sm font-semibold mb-3">System Roles</h3>
            <div className="space-y-3">
              {SYSTEM_ROLES.map(role => (
                <div key={role.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={role.value}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={(checked) => handleRoleToggle(role.value, checked === true)}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor={role.value} className="font-medium cursor-pointer">
                      {role.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3">FDFP Permissions</h3>
            <div className="space-y-3">
              {FDFP_PERMISSIONS.map(permission => (
                <div key={permission.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={permission.value}
                    checked={selectedRoles.includes(permission.value)}
                    onCheckedChange={(checked) => handleRoleToggle(permission.value, checked === true)}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor={permission.value} className="font-medium cursor-pointer">
                      {permission.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{permission.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3">HD Permissions</h3>
            <div className="space-y-3">
              {HD_PERMISSIONS.map(permission => (
                <div key={permission.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={permission.value}
                    checked={selectedRoles.includes(permission.value)}
                    onCheckedChange={(checked) => handleRoleToggle(permission.value, checked === true)}
                  />
                  <div className="space-y-1 leading-none">
                    <Label htmlFor={permission.value} className="font-medium cursor-pointer">
                      {permission.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{permission.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
