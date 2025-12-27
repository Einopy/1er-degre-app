import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
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
  Info,
  Sparkles,
  Send,
  Save,
  Loader2,
  Type,
  Bold,
  Heading1,
  Heading2,
  Highlighter,
} from 'lucide-react';
import type { Workshop } from '@/lib/database.types';
import type { ParticipantWithUser } from '@/services/organizer-workshops';
import {
  fetchOfficialTemplate,
  fetchPersonalTemplate,
  savePersonalTemplate,
  updateLastViewedOfficialVersion,
  AVAILABLE_MERGE_TAGS,
  insertMergeTag,
  type EmailTemplate,
} from '@/services/email-templates';
import { sendWorkshopEmail, prepareRecipientsFromParticipants } from '@/services/email-sending';
import { useToast } from '@/hooks/use-toast';

interface CommunicationTabNewProps {
  workshop: Workshop;
  participants: ParticipantWithUser[];
  currentUserId: string;
}

type EmailMode = 'pre' | 'post' | 'spontane';

export function CommunicationTabNew({
  workshop,
  participants,
  currentUserId,
}: CommunicationTabNewProps) {
  const { toast } = useToast();
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [emailMode, setEmailMode] = useState<EmailMode>('spontane');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const [officialTemplate, setOfficialTemplate] = useState<EmailTemplate | null>(null);
  const [personalTemplate, setPersonalTemplate] = useState<EmailTemplate | null>(null);
  const [hasNewOfficialVersion, setHasNewOfficialVersion] = useState(false);

  const isPastWorkshop = new Date(workshop.start_at) < new Date();

  const eligibleParticipants = participants.filter((p) => {
    if (isPastWorkshop) {
      return p.attended === true && ['inscrit', 'paye'].includes(p.status);
    } else {
      return ['inscrit', 'paye', 'en_attente'].includes(p.status);
    }
  });

  const recipientCount = eligibleParticipants.length;

  useEffect(() => {
    if (emailMode !== 'spontane') {
      loadTemplates();
    }
  }, [emailMode, workshop.workshop_family_id, workshop.language]);

  const loadTemplates = async () => {
    if (emailMode === 'spontane') return;

    setIsLoadingTemplate(true);
    try {
      const [official, personal] = await Promise.all([
        fetchOfficialTemplate(workshop.workshop_family_id, workshop.language, emailMode),
        fetchPersonalTemplate(currentUserId, workshop.workshop_family_id, workshop.language, emailMode),
      ]);

      setOfficialTemplate(official);
      setPersonalTemplate(personal);

      if (personal) {
        setSubject(personal.subject);
        setHtmlContent(personal.html_content);

        if (
          official &&
          personal.last_viewed_official_version < official.official_version
        ) {
          setHasNewOfficialVersion(true);
        }
      } else if (official) {
        setSubject(official.subject);
        setHtmlContent(official.html_content);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les modèles',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  const handleLoadOfficialTemplate = async () => {
    if (!officialTemplate) return;

    setSubject(officialTemplate.subject);
    setHtmlContent(officialTemplate.html_content);
    setHasNewOfficialVersion(false);

    if (personalTemplate) {
      try {
        await updateLastViewedOfficialVersion(
          personalTemplate.id,
          officialTemplate.official_version
        );
      } catch (error) {
        console.error('Error updating viewed version:', error);
      }
    }

    toast({
      title: 'Template chargé',
      description: 'Le template officiel a été chargé',
    });
  };

  const handleSaveAsTemplate = async () => {
    setIsSaving(true);
    try {
      await savePersonalTemplate(
        currentUserId,
        workshop.workshop_family_id,
        workshop.language,
        emailMode === 'spontane' ? 'pre' : emailMode,
        subject,
        htmlContent
      );

      toast({
        title: 'Template sauvegardé',
        description: 'Votre template personnel a été enregistré',
      });

      await loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder le template',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertMergeTag = (tag: string) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const result = insertMergeTag(htmlContent, cursorPos, tag);

    setHtmlContent(result.text);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
    }, 0);
  };

  const handleFormatText = (format: 'bold' | 'h1' | 'h2' | 'highlight') => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = htmlContent.substring(start, end);

    if (!selectedText) {
      toast({
        description: 'Veuillez sélectionner du texte à formater',
      });
      return;
    }

    let formattedText = '';
    switch (format) {
      case 'bold':
        formattedText = `<strong>${selectedText}</strong>`;
        break;
      case 'h1':
        formattedText = `<h1>${selectedText}</h1>`;
        break;
      case 'h2':
        formattedText = `<h2>${selectedText}</h2>`;
        break;
      case 'highlight':
        formattedText = `<mark>${selectedText}</mark>`;
        break;
    }

    const newContent =
      htmlContent.substring(0, start) + formattedText + htmlContent.substring(end);
    setHtmlContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formattedText.length);
    }, 0);
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const recipients = prepareRecipientsFromParticipants(eligibleParticipants);

      await sendWorkshopEmail({
        workshop,
        recipients,
        subject,
        htmlContent,
        senderName: '1er Degré',
        senderEmail: 'noreply@1er-degre.fr',
        emailType: emailMode,
        currentUserId,
      });

      toast({
        title: 'Email envoyé',
        description: `L'email a été envoyé avec succès à ${recipientCount} destinataire(s).`,
      });
      setShowSendDialog(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer l\'email. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const getEmailModeLabel = (mode: EmailMode) => {
    switch (mode) {
      case 'pre':
        return 'Pré-atelier (T-72h)';
      case 'post':
        return 'Post-atelier';
      case 'spontane':
        return 'Spontané';
    }
  };

  const getEmailModeDescription = (mode: EmailMode) => {
    switch (mode) {
      case 'pre':
        return 'Email automatique envoyé 72h avant l\'atelier';
      case 'post':
        return 'Email envoyé après la clôture de l\'atelier';
      case 'spontane':
        return 'Email immédiat aux participants actuels';
    }
  };

  return (
    <div className="w-full space-y-6">
      <Alert className="border-green-500 bg-green-50">
        <Info className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-900">
          Emails transactionnels envoyés via Brevo. Les messages sont personnalisés automatiquement avec les informations du participant et de l'atelier.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Mode d'envoi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={emailMode} onValueChange={(v) => setEmailMode(v as EmailMode)}>
            <div className="space-y-3">
              {(['pre', 'post', 'spontane'] as EmailMode[]).map((mode) => (
                <div key={mode} className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value={mode} id={mode} />
                  <div className="flex-1">
                    <Label htmlFor={mode} className="cursor-pointer font-medium">
                      {getEmailModeLabel(mode)}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {getEmailModeDescription(mode)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </RadioGroup>

          <Separator />

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="text-sm">
              <span className="font-medium">{recipientCount}</span> destinataire
              {recipientCount > 1 ? 's' : ''}
              <p className="text-xs text-muted-foreground mt-1">
                {isPastWorkshop
                  ? 'Participants ayant assisté à l\'atelier'
                  : 'Participants inscrits ou en attente'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {emailMode !== 'spontane' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Modèles</CardTitle>
              {hasNewOfficialVersion && (
                <Badge variant="default" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Nouveau
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {officialTemplate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadOfficialTemplate}
                disabled={isLoadingTemplate}
                className="w-full"
              >
                {isLoadingTemplate ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Type className="h-4 w-4 mr-2" />
                )}
                Charger le template officiel
              </Button>
            )}
            {personalTemplate && (
              <p className="text-sm text-muted-foreground">
                Vous utilisez votre template personnel
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Composer le message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Objet</Label>
            <Input
              ref={subjectInputRef}
              id="subject"
              placeholder="Objet de l'email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Variables de personnalisation</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MERGE_TAGS.map((item) => (
                <Button
                  key={item.tag}
                  variant="outline"
                  size="sm"
                  onClick={() => handleInsertMergeTag(item.tag)}
                  title={item.description}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Formatage</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFormatText('bold')}
                title="Gras"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFormatText('h1')}
                title="Titre H1"
              >
                <Heading1 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFormatText('h2')}
                title="Titre H2"
              >
                <Heading2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFormatText('highlight')}
                title="Surligner"
              >
                <Highlighter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Contenu du message</Label>
            <Textarea
              ref={contentTextareaRef}
              id="content"
              placeholder="Votre message aux participants..."
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              rows={12}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Utilisez les balises HTML pour le formatage. Les variables seront remplacées
              automatiquement lors de l'envoi.
            </p>
          </div>

          <div className="flex gap-3">
            {emailMode !== 'spontane' && (
              <Button
                variant="secondary"
                onClick={handleSaveAsTemplate}
                disabled={isSaving || !subject || !htmlContent}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Sauvegarder comme mon template
              </Button>
            )}
            <Button
              onClick={() => setShowSendDialog(true)}
              disabled={!subject || !htmlContent || recipientCount === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer ({recipientCount})
            </Button>
          </div>
        </CardContent>
      </Card>

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
            <AlertDialogCancel disabled={isSending}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Confirmer l\'envoi'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
