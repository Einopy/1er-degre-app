import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TiptapToolbar } from './TiptapToolbar';
import { PlaceholderNode, convertPlaceholdersToNodes, convertNodesToPlaceholders } from './PlaceholderNode';
import { cn, normalizeEditorHTML } from '@/lib/utils';
import './tiptap-editor.css';

interface TiptapSimpleEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export function TiptapSimpleEditor({
  content = '',
  onChange,
  placeholder = 'Getting started',
  className,
  editable = true,
}: TiptapSimpleEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
        strike: false,
        code: false,
        codeBlock: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      Highlight.configure({
        multicolor: false,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md',
        },
      }),
      TextStyle,
      Color,
      PlaceholderNode,
    ],
    content: convertPlaceholdersToNodes(content || ''),
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const cleanedHtml = convertNodesToPlaceholders(html);
      onChange?.(cleanedHtml);
    },
    editorProps: {
      attributes: {
        class: cn(
          'tiptap-editor',
          'prose prose-sm max-w-none',
          'min-h-[300px] w-full rounded-b-md border border-input bg-background px-4 py-3',
          'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'dark:prose-invert',
          '[&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_p.is-editor-empty:first-child::before]:float-left',
          '[&_p.is-editor-empty:first-child::before]:h-0',
          '[&_p.is-editor-empty:first-child::before]:pointer-events-none'
        ),
      },
    },
  });

  useEffect(() => {
    if (editor && content !== undefined && content !== null) {
      const currentContent = editor.getHTML();
      const safeContent = convertPlaceholdersToNodes(content || '');

      const currentNormalized = normalizeEditorHTML(currentContent);
      const incomingNormalized = normalizeEditorHTML(safeContent);

      if (currentNormalized !== incomingNormalized) {
        editor.commands.setContent(safeContent);
      }
    }
  }, [content, editor]);

  return (
    <div className={cn('', className)}>
      {editable && <TiptapToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
