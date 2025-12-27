import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { User, Calendar, Clock, MapPin, Video, Layout } from 'lucide-react';

// Map placeholder tags to user-friendly labels and icons
const PLACEHOLDER_CONFIG: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  '{{first_name}}': {
    label: 'Prénom',
    icon: <User className="h-3 w-3" />,
    description: 'Prénom du participant'
  },
  '{{last_name}}': {
    label: 'Nom',
    icon: <User className="h-3 w-3" />,
    description: 'Nom du participant'
  },
  '{{workshop_title}}': {
    label: 'Titre atelier',
    icon: <Layout className="h-3 w-3" />,
    description: 'Titre complet de l\'atelier'
  },
  '{{workshop_date}}': {
    label: 'Date',
    icon: <Calendar className="h-3 w-3" />,
    description: 'Date de l\'atelier'
  },
  '{{workshop_time}}': {
    label: 'Heure',
    icon: <Clock className="h-3 w-3" />,
    description: 'Heure de début'
  },
  '{{location}}': {
    label: 'Lieu',
    icon: <MapPin className="h-3 w-3" />,
    description: 'Adresse complète ou "En ligne"'
  },
  '{{visio_link}}': {
    label: 'Lien visio',
    icon: <Video className="h-3 w-3" />,
    description: 'Lien de visioconférence'
  },
  '{{mural_link}}': {
    label: 'Lien Mural',
    icon: <Layout className="h-3 w-3" />,
    description: 'Lien vers l\'espace collaboratif'
  },
};

// React component for rendering the placeholder node
const PlaceholderNodeView = ({ node }: any) => {
  const placeholder = node.attrs.placeholder;
  const config = PLACEHOLDER_CONFIG[placeholder];

  if (!config) {
    return (
      <NodeViewWrapper className="inline-block" contentEditable={false}>
        <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
          {placeholder}
        </Badge>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="inline-block" contentEditable={false}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 cursor-default select-none transition-colors"
            >
              <span className="inline-flex items-center gap-1">
                {config.icon}
                <span className="font-medium">{config.label}</span>
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{config.description}</p>
            <p className="text-xs text-muted-foreground mt-1">Supprimer: Backspace ou Delete</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </NodeViewWrapper>
  );
};

// TipTap extension definition
export const PlaceholderNode = Node.create({
  name: 'placeholderNode',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      placeholder: {
        default: '',
        parseHTML: element => element.getAttribute('data-placeholder'),
        renderHTML: attributes => {
          return {
            'data-placeholder': attributes.placeholder,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-placeholder]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-placeholder': node.attrs.placeholder,
      'class': 'placeholder-node',
    }), node.attrs.placeholder];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PlaceholderNodeView);
  },

  addCommands() {
    return {
      insertPlaceholder: (placeholder: string) => ({ commands }: { commands: any }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { placeholder },
        });
      },
    } as any;
  },
});

// Helper function to convert text placeholders to nodes
export function convertPlaceholdersToNodes(html: string): string {
  if (!html) return '';

  let result = html;

  Object.keys(PLACEHOLDER_CONFIG).forEach(placeholder => {
    const escapedPlaceholder = placeholder.replace(/[{}]/g, '\\$&');
    const regex = new RegExp(escapedPlaceholder, 'g');
    result = result.replace(
      regex,
      `<span data-placeholder="${placeholder}">${placeholder}</span>`
    );
  });

  return result;
}

// Helper function to convert nodes back to text placeholders for saving
export function convertNodesToPlaceholders(html: string): string {
  if (!html) return '';

  return html.replace(
    /<span[^>]*data-placeholder="([^"]+)"[^>]*>.*?<\/span>/g,
    '$1'
  );
}
