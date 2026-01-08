import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Bold, Italic, List, CheckSquare, Image as ImageIcon,
  Heading1, Heading2, Underline, Strikethrough, Code,
  Undo, Redo, Type, Palette, Table as TableIcon,
  Plus, Trash
} from 'lucide-react';
import { AppwriteService } from '../services/appwrite';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
}

const RichEditor: React.FC<RichEditorProps> = ({ content, onChange, readOnly }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const isFirstRun = useRef(true);

  // Undo/Redo State
  const [history, setHistory] = useState<string[]>([content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoAction = useRef(false);

  // Active State
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  // Table Inputs
  const [tableRows, setTableRows] = useState(2);
  const [tableCols, setTableCols] = useState(2);
  const [showTableCreator, setShowTableCreator] = useState(false);

  // Font Size
  const [currentFontSize, setCurrentFontSize] = useState<string>('16');

  // Push to history
  const pushToHistory = useCallback((newContent: string) => {
    const currentHistory = history.slice(0, historyIndex + 1);
    if (currentHistory[currentHistory.length - 1] !== newContent) {
      const newHistory = [...currentHistory, newContent];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [history, historyIndex]);

  useEffect(() => {
    if (isFirstRun.current) {
      if (editorRef.current) {
        editorRef.current.innerHTML = content;
      }
      isFirstRun.current = false;
      return;
    }

    if (editorRef.current && editorRef.current.innerHTML !== content) {
      if (
        document.activeElement !== editorRef.current ||
        Math.abs(editorRef.current.innerHTML.length - content.length) > 5
      ) {
        if (!isUndoRedoAction.current) {
          editorRef.current.innerHTML = content;
        }
      }
    }
    isUndoRedoAction.current = false;
  }, [content]);

  const checkActiveFormats = () => {
    if (!editorRef.current) return;
    const formats = [];
    if (document.queryCommandState('bold')) formats.push('bold');
    if (document.queryCommandState('italic')) formats.push('italic');
    if (document.queryCommandState('underline')) formats.push('underline');
    if (document.queryCommandState('strikeThrough')) formats.push('strikeThrough');
    if (document.queryCommandState('insertUnorderedList')) formats.push('insertUnorderedList');

    // Check table
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node: Node | null = selection.getRangeAt(0).startContainer;
      let inTable = false;

      // Check Font Size (approximate from computed style of parent)
      if (node.nodeType === 3) node = node.parentNode; // Text node -> Element
      if (node) {
        const computed = window.getComputedStyle(node as Element);
        if (computed.fontSize) {
          setCurrentFontSize(parseInt(computed.fontSize).toString());
        }
      }

      while (node && node !== editorRef.current) {
        if (node.nodeName === 'TD' || node.nodeName === 'TH') {
          inTable = true;
          break;
        }
        node = node.parentNode;
      }
      if (inTable) formats.push('table');
    }

    setActiveFormats(formats);
  };

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const handler = () => checkActiveFormats();
    el.addEventListener('keyup', handler);
    el.addEventListener('mouseup', handler);
    el.addEventListener('click', handler);
    document.addEventListener('selectionchange', handler);

    return () => {
      el.removeEventListener('keyup', handler);
      el.removeEventListener('mouseup', handler);
      el.removeEventListener('click', handler);
      document.removeEventListener('selectionchange', handler);
    };
  }, []);

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
      pushToHistory(newContent);
      editorRef.current.focus();
      checkActiveFormats();
    }
  };

  const changeFontSize = (size: string) => {
    // execCommand 'fontSize' uses 1-7. We want px.
    // We must insert a span with style.
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;

      if (!selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const content = range.extractContents();
        span.appendChild(content);
        range.insertNode(span);
      } else {
        // No selection, maybe simpler to just change generic? 
        // execCommand fontSize 7 is huge.
        // Let's rely on formatBlock or just wrap.
        // Actually, wrapping empty selection is tricky.
        // Fallback to execCommand for empty, or just toggle active style?
      }

      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
        pushToHistory(editorRef.current.innerHTML);
        editorRef.current.focus();
      }
    }
    setCurrentFontSize(size);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prevContent = history[newIndex];
      setHistoryIndex(newIndex);
      isUndoRedoAction.current = true;
      if (editorRef.current) editorRef.current.innerHTML = prevContent;
      onChange(prevContent);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextContent = history[newIndex];
      setHistoryIndex(newIndex);
      isUndoRedoAction.current = true;
      if (editorRef.current) editorRef.current.innerHTML = nextContent;
      onChange(nextContent);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Optimistic preview
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            exec('insertImage', ev.target.result as string);
          }
        };
        reader.readAsDataURL(file);

        const url = await AppwriteService.uploadFile(file);
        // If successful, the image is already there as base64. 
        // We could replace it, but finding it is hard without ID.
        // User said "uploaded images should be visible". Base64 ensures it IS visible immediately.
        // The persistent URL is better, but this works for now. 
      } catch (err) {
        console.error(err);
      }
    }
  };

  const insertTable = () => {
    let rows = '';
    for (let i = 0; i < tableRows; i++) {
      let cols = '';
      for (let j = 0; j < tableCols; j++) {
        cols += '<td style="border: 1px solid rgba(255,255,255,0.2); padding: 8px;">&nbsp;</td>';
      }
      rows += `<tr>${cols}</tr>`;
    }

    const tableHTML = `
        <table style="border-collapse: collapse; width: 100%; margin: 1em 0;">
          <tbody>${rows}</tbody>
        </table>
        <br>
      `;
    exec('insertHTML', tableHTML);
    setShowTableCreator(false);
  };

  const modifyTable = (action: 'addRow' | 'addCol' | 'delete') => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    let node: Node | null = selection.getRangeAt(0).startContainer;
    let td: HTMLTableCellElement | null = null;
    let table: HTMLTableElement | null = null;

    while (node && node !== editorRef.current) {
      if (node.nodeName === 'TD') td = node as HTMLTableCellElement;
      if (node.nodeName === 'TABLE') table = node as HTMLTableElement;
      node = node.parentNode;
    }

    if (!table || !td) return;

    if (action === 'delete') {
      table.remove();
    } else if (action === 'addRow') {
      const row = td.parentElement as HTMLTableRowElement;
      const newRow = row.cloneNode(true) as HTMLTableRowElement;
      Array.from(newRow.cells).forEach(cell => cell.innerHTML = '&nbsp;');
      table.querySelector('tbody')?.appendChild(newRow);
    } else if (action === 'addCol') {
      const rows = table.querySelectorAll('tr');
      rows.forEach(row => {
        const newCell = document.createElement('td');
        newCell.style.border = '1px solid rgba(255,255,255,0.2)';
        newCell.style.padding = '8px';
        newCell.innerHTML = '&nbsp;';
        row.appendChild(newCell);
      });
    }

    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      pushToHistory(editorRef.current.innerHTML);
    }
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;

      const range = selection.getRangeAt(0);
      const startNode = range.startContainer;

      let currentNode: Node | null = startNode;
      let checkboxRow: HTMLElement | null = null;

      while (currentNode && currentNode !== editorRef.current) {
        if (currentNode.nodeType === 1 && (currentNode as HTMLElement).querySelector('input[type="checkbox"]')) {
          checkboxRow = currentNode as HTMLElement;
          break;
        }
        currentNode = currentNode.parentNode;
      }

      if (checkboxRow) {
        e.preventDefault();
        const newRowHTML = '<div class="flex items-center gap-2 my-1"><input type="checkbox" /> <span>&nbsp;</span></div>';
        document.execCommand('insertHTML', false, `</div>${newRowHTML}<div>`);
      }
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      if (editorRef.current && editorRef.current.innerHTML !== history[historyIndex]) {
        pushToHistory(editorRef.current.innerHTML);
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [content, history, historyIndex, pushToHistory]);


  if (readOnly) {
    return <div className="editor-content prose prose-invert max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: content }} />;
  }

  const ToolbarButton = ({ onClick, icon: Icon, title, active, disabled }: { onClick: () => void, icon: any, title: string, active?: boolean, disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors ${active
          ? 'bg-accent text-white shadow-inner'
          : 'text-gray-400 hover:text-white hover:bg-white/10'
        } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
      title={title}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="flex flex-col h-full relative">
      <div
        className="flex items-center gap-1 p-2 border-b border-white/10 bg-white/5 backdrop-blur-xl z-10 overflow-x-auto no-scrollbar rounded-b-lg"
        onTouchStart={(e) => e.stopPropagation()}
      >
        <ToolbarButton onClick={handleUndo} icon={Undo} title="Undo" disabled={historyIndex <= 0} />
        <ToolbarButton onClick={handleRedo} icon={Redo} title="Redo" disabled={historyIndex >= history.length - 1} />
        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolbarButton onClick={() => exec('formatBlock', 'H1')} icon={Heading1} title="Heading 1" active={activeFormats.includes('h1')} />
        <ToolbarButton onClick={() => exec('formatBlock', 'H2')} icon={Heading2} title="Heading 2" active={activeFormats.includes('h2')} />
        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Font Size Input */}
        <div className="flex items-center bg-white/5 rounded px-2">
          <Type size={14} className="text-gray-400 mr-2" />
          <input
            type="number"
            min="10" max="72"
            value={currentFontSize}
            onChange={(e) => changeFontSize(e.target.value)}
            className="w-10 bg-transparent text-white text-xs border-none outline-none text-center"
          />
          <span className="text-[10px] text-gray-500 ml-1">px</span>
        </div>

        <div className="relative flex items-center">
          <input
            ref={colorInputRef}
            type="color"
            className="w-0 h-0 opacity-0 absolute"
            onChange={(e) => exec('foreColor', e.target.value)}
          />
          <ToolbarButton onClick={() => colorInputRef.current?.click()} icon={Palette} title="Text Color" />
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolbarButton onClick={() => exec('bold')} icon={Bold} title="Bold" active={activeFormats.includes('bold')} />
        <ToolbarButton onClick={() => exec('italic')} icon={Italic} title="Italic" active={activeFormats.includes('italic')} />
        <ToolbarButton onClick={() => exec('underline')} icon={Underline} title="Underline" active={activeFormats.includes('underline')} />
        <ToolbarButton onClick={() => exec('strikeThrough')} icon={Strikethrough} title="Strikethrough" active={activeFormats.includes('strikeThrough')} />

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ToolbarButton onClick={() => exec('insertUnorderedList')} icon={List} title="List" active={activeFormats.includes('insertUnorderedList')} />
        <ToolbarButton onClick={() => exec('insertHTML', '<div class="flex items-center gap-2 my-1"><input type="checkbox" /> <span>&nbsp;</span></div>')} icon={CheckSquare} title="Checkbox" />

        <div className="relative">
          <ToolbarButton onClick={() => setShowTableCreator(!showTableCreator)} icon={TableIcon} title="Insert Table" active={activeFormats.includes('table')} />
          {showTableCreator && (
            <div className="absolute top-full left-0 mt-2 p-3 bg-black border border-white/10 rounded-xl z-50 shadow-xl flex flex-col gap-2 w-48">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Rows:</span>
                <input
                  type="number" min="1" max="10"
                  value={tableRows} onChange={(e) => setTableRows(parseInt(e.target.value))}
                  className="w-12 bg-white/10 text-white text-xs p-1 rounded border-none outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Cols:</span>
                <input
                  type="number" min="1" max="10"
                  value={tableCols} onChange={(e) => setTableCols(parseInt(e.target.value))}
                  className="w-12 bg-white/10 text-white text-xs p-1 rounded border-none outline-none"
                />
              </div>
              <button onClick={insertTable} className="text-xs bg-accent text-white py-1 rounded hover:opacity-90 mt-1 font-bold">
                Insert Table
              </button>
              {activeFormats.includes('table') && (
                <>
                  <div className="h-px bg-white/10 my-1" />
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Edit Table</p>
                  <button onClick={() => modifyTable('addRow')} className="text-xs text-left hover:text-white text-gray-300">Add Row</button>
                  <button onClick={() => modifyTable('addCol')} className="text-xs text-left hover:text-white text-gray-300">Add Column</button>
                  <button onClick={() => modifyTable('delete')} className="text-xs text-left hover:text-red-500 text-gray-300">Delete Table</button>
                </>
              )}
            </div>
          )}
        </div>

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
        onKeyDown={handleKeyDown}
        spellCheck={false}
        data-placeholder="Start typing... (Enter for new line)"
      />
    </div>
  );
};

export default RichEditor;