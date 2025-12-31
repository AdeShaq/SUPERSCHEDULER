import React, { useRef, useEffect } from 'react';
import { Bold, Italic, List, CheckSquare, Image as ImageIcon, Heading1, Heading2 } from 'lucide-react';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
}

const RichEditor: React.FC<RichEditorProps> = ({ content, onChange, readOnly }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      if (Math.abs(editorRef.current.innerHTML.length - content.length) > 5) {
        editorRef.current.innerHTML = content;
      }
    }
  }, [content]);

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      editorRef.current.focus();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          exec('insertImage', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  if (readOnly) {
    return <div className="editor-content prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: content }} />;
  }

  const ToolbarButton = ({ onClick, icon: Icon, title }: { onClick: () => void, icon: any, title: string }) => (
    <button 
      onClick={onClick} 
      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" 
      title={title}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="flex flex-col h-full relative">
      {/* Stop propagation on the toolbar to prevent swiping tabs while scrolling tools */}
      <div 
        className="flex items-center gap-1 p-2 border-b border-white/10 bg-white/5 backdrop-blur-xl z-10 overflow-x-auto no-scrollbar rounded-b-lg"
        onTouchStart={(e) => e.stopPropagation()}
      >
        <ToolbarButton onClick={() => exec('formatBlock', 'H1')} icon={Heading1} title="Heading 1" />
        <ToolbarButton onClick={() => exec('formatBlock', 'H2')} icon={Heading2} title="Heading 2" />
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarButton onClick={() => exec('bold')} icon={Bold} title="Bold" />
        <ToolbarButton onClick={() => exec('italic')} icon={Italic} title="Italic" />
        <div className="w-px h-5 bg-white/10 mx-1" />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} icon={List} title="List" />
        <ToolbarButton onClick={() => exec('insertHTML', '<div class="flex items-center gap-2 my-1"><input type="checkbox" /> <span>&nbsp;</span></div>')} icon={CheckSquare} title="Checkbox" />
        <label className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer" title="Image">
          <ImageIcon size={18} />
          <input type="file" className="hidden" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} />
        </label>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="flex-1 p-4 md:p-6 editor-content outline-none overflow-y-auto text-base md:text-lg leading-relaxed text-gray-200"
        onInput={handleInput}
        spellCheck={false}
        dangerouslySetInnerHTML={{ __html: content }}
        data-placeholder="Start typing..."
      />
    </div>
  );
};

export default RichEditor;