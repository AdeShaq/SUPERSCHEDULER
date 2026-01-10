import React, { useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, CheckSquare,
  AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Type, Eraser, Palette,
  Undo, Redo
} from 'lucide-react';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const RichEditor: React.FC<RichEditorProps> = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[50vh]',
      },
    },
  });

  // Sync content from outside if it changes significantly (e.g. valid note switch)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Only trigger if difference is substantial to avoid cursor jumps
      // For simple note switching, we assume content prop changes fully.
      // But for local typing, onUpdate handles it.
      // We'll compare stripped text or just rely on parent keying the component.
      // Parent `Vault.tsx` keys this component by `note.id`, so we can safely set content on mount/change.
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ onClick, isActive, icon: Icon, disabled = false }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded transition-all duration-200 ${isActive ? 'bg-accent text-black shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'
        } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* TOOLBAR */}
      <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-white/5 backdrop-blur-xl overflow-x-auto no-scrollbar shrink-0 sticky top-0 z-10">

        {/* History */}
        <div className="flex items-center gap-0.5 border-r border-white/10 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            icon={Undo}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            icon={Redo}
          />
        </div>

        {/* Formatting */}
        <div className="flex items-center gap-0.5 border-r border-white/10 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={Bold}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={Italic}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            icon={UnderlineIcon}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            icon={Strikethrough}
          />
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 border-r border-white/10 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            icon={Heading1}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            icon={Heading2}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setParagraph().run()}
            isActive={editor.isActive('paragraph')}
            icon={Type}
          />
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 border-r border-white/10 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            icon={AlignLeft}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            icon={AlignCenter}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            icon={AlignRight}
          />
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 border-r border-white/10 pr-2 mr-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={List}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={ListOrdered}
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
            icon={CheckSquare}
          />
        </div>

        {/* Colors & Utils */}
        <div className="flex items-center gap-0.5">
          <div className="relative group">
            <button className={`p-2 rounded text-gray-400 hover:text-white hover:bg-white/10`}>
              <Palette size={18} />
            </button>
            <div className="absolute top-full left-0 mt-2 bg-black border border-white/20 p-2 rounded flex gap-1 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all">
              {['#ffffff', '#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'].map(color => (
                <button
                  key={color}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                  className="w-4 h-4 rounded-full border border-white/20 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <ToolbarButton
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            icon={Eraser}
          />
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 md:px-12 md:py-8 cursor-text" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );
};

export default RichEditor;