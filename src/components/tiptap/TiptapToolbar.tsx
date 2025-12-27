import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Image as ImageIcon,
  Link as LinkIcon,
  Unlink,
  Highlighter,
  Undo,
  Redo,
  Type,
  Smile,
  BracesIcon,
} from 'lucide-react';
import { useState } from 'react';

interface TiptapToolbarProps {
  editor: Editor | null;
}

const ALL_EMOJIS = [
  { emoji: '👋', label: 'Salut' },
  { emoji: '👍', label: 'Pouce en l\'air' },
  { emoji: '😊', label: 'Sourire' },
  { emoji: '❤️', label: 'Coeur' },
  { emoji: '⭐', label: 'Étoile' },
  { emoji: '✨', label: 'Étincelles' },
  { emoji: '🎉', label: 'Célébration' },
  { emoji: '💪', label: 'Force' },
  { emoji: '🙏', label: 'Merci' },
  { emoji: '👏', label: 'Applaudissements' },
  { emoji: '✅', label: 'Validé' },
  { emoji: '📧', label: 'Email' },
  { emoji: '📅', label: 'Calendrier' },
  { emoji: '⏰', label: 'Horloge' },
  { emoji: '📍', label: 'Lieu' },
  { emoji: '🌱', label: 'Plante' },
  { emoji: '🌍', label: 'Planète Terre' },
  { emoji: '♻️', label: 'Recyclage' },
  { emoji: '🍃', label: 'Feuille' },
  { emoji: '🌳', label: 'Arbre' },
  { emoji: '🌲', label: 'Sapin' },
  { emoji: '☀️', label: 'Soleil' },
  { emoji: '💧', label: 'Goutte d\'eau' },
  { emoji: '🚲', label: 'Vélo' },
  { emoji: '🌿', label: 'Herbe' },
  { emoji: '🌾', label: 'Blé' },
  { emoji: '🌸', label: 'Fleur' },
  { emoji: '🐝', label: 'Abeille' },
  { emoji: '🦋', label: 'Papillon' },
  { emoji: '🌈', label: 'Arc-en-ciel' },
];

const PLACEHOLDER_ITEMS = [
  { placeholder: '{{first_name}}', label: 'Prénom', description: 'Prénom du participant' },
  { placeholder: '{{last_name}}', label: 'Nom', description: 'Nom du participant' },
  { placeholder: '{{workshop_title}}', label: 'Titre de l\'atelier', description: 'Titre complet de l\'atelier' },
  { placeholder: '{{workshop_date}}', label: 'Date', description: 'Date de l\'atelier' },
  { placeholder: '{{workshop_time}}', label: 'Heure', description: 'Heure de début' },
  { placeholder: '{{location}}', label: 'Lieu', description: 'Adresse complète ou "En ligne"' },
  { placeholder: '{{visio_link}}', label: 'Lien visio', description: 'Lien de visioconférence' },
  { placeholder: '{{mural_link}}', label: 'Lien Mural', description: 'Lien vers l\'espace collaboratif' },
];

export function TiptapToolbar({ editor }: TiptapToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false);
  const [isPlaceholderPopoverOpen, setIsPlaceholderPopoverOpen] = useState(false);

  if (!editor) {
    return null;
  }

  const handleInsertEmoji = (emoji: string) => {
    editor.chain().focus().insertContent(emoji).run();
    setIsEmojiPopoverOpen(false);
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    (editor as any).chain().focus().insertPlaceholder(placeholder).run();
    setIsPlaceholderPopoverOpen(false);
  };

  const handleSetLink = () => {
    if (!linkUrl) {
      editor.chain().focus().unsetLink().run();
      setIsLinkPopoverOpen(false);
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: linkUrl })
      .run();

    setLinkUrl('');
    setIsLinkPopoverOpen(false);
  };

  const handleImageUpload = () => {
    if (!imageUrl) {
      setIsImageDialogOpen(false);
      return;
    }

    editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageUrl('');
    setIsImageDialogOpen(false);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1 p-2 border border-b-0 rounded-t-md bg-muted/30">
        <Popover open={isPlaceholderPopoverOpen} onOpenChange={setIsPlaceholderPopoverOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300">
                  <BracesIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Insérer une variable</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-3 border-b">
              <h4 className="font-semibold text-sm">Variables de personnalisation</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Ces champs seront automatiquement remplis pour chaque participant
              </p>
            </div>
            <ScrollArea className="h-[280px]">
              <div className="p-2 space-y-1">
                {PLACEHOLDER_ITEMS.map((item) => (
                  <Button
                    key={item.placeholder}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto py-2 px-3 text-left"
                    onClick={() => handleInsertPlaceholder(item.placeholder)}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-medium text-sm">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('heading', { level: 1 })}
              onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Heading 1</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('heading', { level: 2 })}
              onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Heading 2</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('paragraph')}
              onPressedChange={() => editor.chain().focus().setParagraph().run()}
            >
              <Type className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Paragraph</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('bold')}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Bold (Ctrl+B)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('italic')}
              onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Italic (Ctrl+I)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('underline')}
              onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
            >
              <Underline className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Underline (Ctrl+U)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('highlight')}
              onPressedChange={() => editor.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Highlight</TooltipContent>
        </Tooltip>

        <Popover open={isEmojiPopoverOpen} onOpenChange={setIsEmojiPopoverOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Insérer un emoji</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="grid grid-cols-8 gap-1">
              {ALL_EMOJIS.map((item) => (
                <Button
                  key={item.emoji}
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-xl hover:bg-accent"
                  onClick={() => handleInsertEmoji(item.emoji)}
                  title={item.label}
                >
                  {item.emoji}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>


        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('bulletList')}
              onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Bullet List</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('orderedList')}
              onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Ordered List</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: 'left' })}
              onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
            >
              <AlignLeft className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Align Left</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: 'center' })}
              onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
            >
              <AlignCenter className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Align Center</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive({ textAlign: 'right' })}
              onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
            >
              <AlignRight className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Align Right</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={editor.isActive('blockquote')}
              onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="h-4 w-4" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent>Blockquote</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Toggle size="sm" pressed={editor.isActive('link')}>
                  <LinkIcon className="h-4 w-4" />
                </Toggle>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Add Link (Ctrl+K)</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-80">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="link-url">URL</Label>
                <Input
                  id="link-url"
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSetLink();
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLinkUrl('');
                    setIsLinkPopoverOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSetLink}>
                  Set Link
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {editor.isActive('link') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={true}
                onPressedChange={() => editor.chain().focus().unsetLink().run()}
              >
                <Unlink className="h-4 w-4" />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>Remove Link</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setIsImageDialogOpen(true)}>
              <ImageIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert Image</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
      </div>

      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>
              Enter the URL of the image you want to insert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleImageUpload();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImageUrl('');
                setIsImageDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImageUpload}>
              Insert Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
