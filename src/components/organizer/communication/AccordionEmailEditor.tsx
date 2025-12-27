import { useState, useEffect } from 'react';
import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TiptapSimpleEditor } from '@/components/tiptap/TiptapSimpleEditor';
import { Save, Send, Mail, Loader2, FileText, Sparkles, ChevronDown, CheckCircle, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type LoadedTemplateType = 'official' | 'personal' | 'none';

interface AccordionEmailEditorProps {
  value: string;
  subject: string;
  title: string;
  accordionValue: string;
  scheduleLabel?: string;
  subtitleText?: string;
  requiresAction?: boolean;
  recipientCount: number;
  canLoadTemplate: boolean;
  hasOfficialTemplate: boolean;
  hasPersonalTemplate: boolean;
  hasNewOfficialVersion: boolean;
  loadedTemplate: LoadedTemplateType;
  onLoadOfficialTemplate: () => Promise<void>;
  onLoadPersonalTemplate: () => Promise<void>;
  onSave: (content: string, subject: string) => Promise<void>;
  onSaveAsTemplate: (content: string, subject: string) => Promise<void>;
  onSend: (content: string) => Promise<void>;
  onSendTest: (email: string, content: string) => Promise<void>;
  organizerEmail: string;
  isDirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSubjectChange: (subject: string) => void;
  onContentChange: (content: string) => void;
  roundedStyle?: 'top' | 'bottom' | 'both' | 'none';
  isContactSection?: boolean;
  canSaveAsTemplate: boolean;
  savedSubject: string;
  savedContent: string;
  isLoadingTemplate?: boolean;
  isPostWorkshopSection?: boolean;
  canCloseWorkshop?: boolean;
  onSendAndClose?: (content: string) => Promise<void>;
  onCloseWithoutSending?: () => Promise<void>;
  isProgrammedEmail?: boolean;
  emailSentDate?: Date | null;
  isLocked?: boolean;
}

export function AccordionEmailEditor({
  value,
  subject: subjectProp,
  title,
  accordionValue,
  scheduleLabel,
  subtitleText,
  requiresAction = false,
  recipientCount,
  canLoadTemplate,
  hasOfficialTemplate,
  hasPersonalTemplate,
  hasNewOfficialVersion,
  loadedTemplate,
  onLoadOfficialTemplate,
  onLoadPersonalTemplate,
  onSave,
  onSaveAsTemplate,
  onSend,
  onSendTest,
  organizerEmail,
  isDirty,
  onDirtyChange,
  onSubjectChange,
  onContentChange,
  roundedStyle = 'both',
  isContactSection = false,
  canSaveAsTemplate,
  savedSubject,
  savedContent,
  isPostWorkshopSection = false,
  canCloseWorkshop = false,
  onSendAndClose,
  onCloseWithoutSending,
  isProgrammedEmail = false,
  emailSentDate: _emailSentDate,
  isLocked = false,
}: AccordionEmailEditorProps) {
  const { toast } = useToast();
  const [editorContent, setEditorContent] = useState(value || '');
  const [subject, setSubject] = useState(subjectProp || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [showSendAndCloseDialog, setShowSendAndCloseDialog] = useState(false);
  const [showCloseWithoutSendingDialog, setShowCloseWithoutSendingDialog] = useState(false);
  const [testEmail, setTestEmail] = useState(organizerEmail);

  useEffect(() => {
    setEditorContent(value || '');
    setSubject(subjectProp || '');
  }, [value, subjectProp]);

  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    onContentChange(content);

    if (!isContactSection) {
      const normalizedContent = (content || '').trim();
      const normalizedSavedContent = (savedContent || '').trim();
      const normalizedSubject = (subject || '').trim();
      const normalizedSavedSubject = (savedSubject || '').trim();

      const hasChanges =
        normalizedContent !== normalizedSavedContent ||
        normalizedSubject !== normalizedSavedSubject;

      if (hasChanges !== isDirty) {
        onDirtyChange(hasChanges);
      }
    }
  };

  const handleSubjectChange = (newSubject: string) => {
    setSubject(newSubject);
    onSubjectChange(newSubject);

    if (!isContactSection) {
      const normalizedEditorContent = (editorContent || '').trim();
      const normalizedSavedContent = (savedContent || '').trim();
      const normalizedSubject = (newSubject || '').trim();
      const normalizedSavedSubject = (savedSubject || '').trim();

      const hasChanges =
        normalizedEditorContent !== normalizedSavedContent ||
        normalizedSubject !== normalizedSavedSubject;

      if (hasChanges !== isDirty) {
        onDirtyChange(hasChanges);
      }
    }
  };

  const handleLoadOfficialTemplate = async () => {
    setIsLoading(true);
    try {
      await onLoadOfficialTemplate();
      toast({
        description: 'Template officiel chargé',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le template',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPersonalTemplate = async () => {
    setIsLoading(true);
    try {
      await onLoadPersonalTemplate();
      toast({
        description: 'Votre template chargé',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le template',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(editorContent, subject);
      toast({
        description: 'Contenu sauvegardé',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    setIsLoading(true);
    try {
      await onSaveAsTemplate(editorContent, subject);
      toast({
        description: 'Template personnel sauvegardé',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le template',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    setIsLoading(true);
    try {
      await onSend(editorContent);
      setShowSendDialog(false);

      if (isContactSection) {
        setEditorContent('');
        setSubject('');
        onContentChange('');
        onSubjectChange('');
      }

      toast({
        title: 'Email envoyé',
        description: `L'email a été envoyé à ${recipientCount} destinataire(s)`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'email',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast({
        description: 'Veuillez entrer une adresse email',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await onSendTest(testEmail, editorContent);
      setShowTestDialog(false);
      toast({
        description: `Email de test envoyé à ${testEmail}`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'email de test',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAndClose = async () => {
    if (!onSendAndClose) return;

    setIsLoading(true);
    try {
      await onSendAndClose(editorContent);
      setShowSendAndCloseDialog(false);
      toast({
        title: 'Email envoyé et atelier clôturé',
        description: `L'email a été envoyé à ${recipientCount} destinataire(s) et l'atelier a été clôturé.`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'email ou de clôturer l\'atelier',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseWithoutSending = async () => {
    if (!onCloseWithoutSending) return;

    setIsLoading(true);
    try {
      await onCloseWithoutSending();
      setShowCloseWithoutSendingDialog(false);
      toast({
        title: 'Atelier clôturé',
        description: 'L\'atelier a été clôturé sans envoi d\'email.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de clôturer l\'atelier',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoundedClasses = () => {
    switch (roundedStyle) {
      case 'top':
        return 'rounded-t-lg border-b-0';
      case 'bottom':
        return 'rounded-b-lg';
      case 'none':
        return '';
      case 'both':
      default:
        return 'rounded-lg';
    }
  };

  const getMarginClasses = () => {
    return isContactSection ? 'mt-6' : '';
  };

  return (
    <AccordionItem
      value={accordionValue}
      className={`border overflow-hidden bg-card ${getRoundedClasses()} ${getMarginClasses()} data-[state=open]:bg-accent/20`}
    >
      <AccordionTrigger className="hover:no-underline hover:bg-accent/50 px-6 py-4 transition-colors data-[state=open]:bg-accent/30">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">{title}</span>
              {isLocked && (
                <Badge
                  variant="secondary"
                  className="text-xs gap-1"
                >
                  <Lock className="h-3 w-3" />
                  Verrouillé
                </Badge>
              )}
              {isDirty && !isContactSection && !isLocked && (
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100"
                >
                  Non sauvegardé
                </Badge>
              )}
            </div>
            {scheduleLabel && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>{scheduleLabel}</span>
              </div>
            )}
            {subtitleText && !scheduleLabel && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{subtitleText}</span>
              </div>
            )}
            {requiresAction && (
              <Badge variant="destructive" className="text-xs">
                Action requise pour clôturer l'atelier
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasNewOfficialVersion && canLoadTemplate && (
              <Badge variant="default" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Nouveau
              </Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-6 pb-6 pt-4 space-y-4">
        {canLoadTemplate && (hasOfficialTemplate || hasPersonalTemplate) && !isLocked && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isLoading}>
                  <FileText className="h-4 w-4 mr-2" />
                  {loadedTemplate === 'official' && 'Template officiel'}
                  {loadedTemplate === 'personal' && 'Mon template'}
                  {loadedTemplate === 'none' && 'Charger un template'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {hasOfficialTemplate && (
                  <DropdownMenuItem onClick={handleLoadOfficialTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    Template officiel
                  </DropdownMenuItem>
                )}
                {hasPersonalTemplate && (
                  <DropdownMenuItem onClick={handleLoadPersonalTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    Mon template
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor={`subject-${title}`}>Objet</Label>
          <Input
            id={`subject-${title}`}
            placeholder="Objet de l'email"
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            disabled={isLocked}
            className={isLocked ? 'bg-muted cursor-not-allowed' : ''}
          />
        </div>

        <div className="space-y-2">
          <Label>Contenu du message</Label>
          <TiptapSimpleEditor
            content={editorContent}
            onChange={handleEditorChange}
            placeholder="Écrivez votre message…"
            editable={!isLocked}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {!isContactSection && !isLocked && (
            <>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!isDirty || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Sauvegarder
              </Button>

              {canLoadTemplate && (
                <Button
                  variant="secondary"
                  onClick={handleSaveAsTemplate}
                  disabled={!canSaveAsTemplate || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Sauvegarder comme mon template
                </Button>
              )}
            </>
          )}

          <Button
            variant="outline"
            onClick={() => setShowTestDialog(true)}
            disabled={isLoading || !editorContent || !subject}
          >
            <Mail className="h-4 w-4 mr-2" />
            Envoyer un test
          </Button>

          {!isProgrammedEmail && !isLocked && (
            <>
              {isPostWorkshopSection && canCloseWorkshop ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={isLoading} className="gap-1.5">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuItem
                      onClick={() => setShowSendAndCloseDialog(true)}
                      disabled={isLoading || recipientCount === 0 || isDirty}
                      className="py-3 cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4 mr-3" />
                      <div className="flex flex-col">
                        <span className="font-medium">Envoyer et clôturer</span>
                        {isDirty && (
                          <span className="text-xs text-muted-foreground">
                            Sauvegardez d'abord vos modifications
                          </span>
                        )}
                        {recipientCount === 0 && !isDirty && (
                          <span className="text-xs text-muted-foreground">
                            Aucun destinataire
                          </span>
                        )}
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowCloseWithoutSendingDialog(true)}
                      disabled={isLoading}
                      className="py-3 cursor-pointer"
                    >
                      <Lock className="h-4 w-4 mr-3" />
                      <span className="font-medium">Clôturer sans envoyer</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => setShowSendDialog(true)}
                  disabled={isLoading || recipientCount === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer ({recipientCount})
                </Button>
              )}
            </>
          )}
        </div>

        {/* Dialog envoi réel */}
        <AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer l'envoi</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point d'envoyer cet email à {recipientCount} participant
                {recipientCount > 1 ? 's' : ''}. Cette action ne peut pas être annulée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleSend} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  "Confirmer l'envoi"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog test */}
        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Envoyer un email de test</DialogTitle>
              <DialogDescription>
                L'email sera envoyé avec toutes les variables de personnalisation remplacées.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">Adresse email</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="email@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowTestDialog(false)}
                disabled={isLoading}
              >
                Annuler
              </Button>
              <Button onClick={handleSendTest} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  'Envoyer le test'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog envoyer et cloturer */}
        <AlertDialog open={showSendAndCloseDialog} onOpenChange={setShowSendAndCloseDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Envoyer l'email et clôturer l'atelier</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point d'envoyer l'email post-atelier à {recipientCount} participant
                {recipientCount > 1 ? 's' : ''} et de clôturer l'atelier. L'atelier passera au statut
                "Clôturé" et ne sera plus modifiable. Cette action ne peut pas être annulée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleSendAndClose} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    En cours...
                  </>
                ) : (
                  'Envoyer et clôturer'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog cloturer sans envoyer */}
        <AlertDialog open={showCloseWithoutSendingDialog} onOpenChange={setShowCloseWithoutSendingDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clôturer l'atelier sans envoyer d'email</AlertDialogTitle>
              <AlertDialogDescription>
                Vous êtes sur le point de clôturer l'atelier sans envoyer d'email post-atelier.
                Les {recipientCount} participant{recipientCount > 1 ? 's' : ''} ne recevront pas
                d'email de remerciement ou de feedback. L'atelier passera au statut "Clôturé" et ne
                sera plus modifiable. Cette action ne peut pas être annulée.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleCloseWithoutSending} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Clôture en cours...
                  </>
                ) : (
                  'Clôturer sans envoyer'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AccordionContent>
    </AccordionItem>
  );
}