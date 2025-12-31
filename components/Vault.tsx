import React, { useState, useEffect, useRef } from 'react';
import { Plus, BrainCircuit, Loader2, ArrowLeft, Trash2, HelpCircle } from 'lucide-react';
import { Note, Folder } from '../types';
import { StorageService } from '../services/storage';
import RichEditor from './RichEditor';
import { GeminiService } from '../services/geminiService';

const Vault: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('default');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showAiTooltip, setShowAiTooltip] = useState(false);
  
  // Swipe State
  const [swipeNoteId, setSwipeNoteId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    setFolders(StorageService.getFolders());
    setNotes(StorageService.getNotes());
  }, []);

  const saveNotes = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    StorageService.saveNotes(updatedNotes);
  };

  const createNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Entry',
      content: '',
      folderId: selectedFolderId,
      tags: [],
      updatedAt: Date.now(),
    };
    saveNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    const updatedNotes = notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n);
    saveNotes(updatedNotes);
  };

  const deleteNote = (id: string) => {
    // Direct delete, the button handler should handle confirmation if needed
    // or we can do it here. Given the user complaint, let's make it robust.
    const updatedNotes = notes.filter(n => n.id !== id);
    saveNotes(updatedNotes);
    if (selectedNoteId === id) setSelectedNoteId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Permanently delete this note?")) {
        deleteNote(id);
    }
  };

  const handleSmartSummary = async () => {
    const note = notes.find(n => n.id === selectedNoteId);
    if (!note || !note.content) return;

    setIsSummarizing(true);
    const summary = await GeminiService.summarizeNote(note.content);
    setIsSummarizing(false);
    
    const summaryHtml = `<div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 0.9em; color: #d4d4d8;"><strong style="text-transform: uppercase; display: block; margin-bottom: 8px; color: #10b981;">✦ AI Insight</strong>${summary.split('\n').map(line => `<div style="margin-bottom: 4px;">${line}</div>`).join('')}</div>`;
    updateNote(note.id, { content: note.content + summaryHtml });
  };

  // Swipe Handlers
  const onTouchStart = (e: React.TouchEvent, noteId: string) => {
    e.stopPropagation(); // Prevent Global Tab Swipe
    touchStartX.current = e.targetTouches[0].clientX;
    setSwipeNoteId(noteId);
    setSwipeOffset(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent Global Tab Swipe
    if (!swipeNoteId) return;
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStartX.current;
    
    if (diff > 0) {
      setSwipeOffset(diff);
      if (diff > 10) e.preventDefault(); 
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (swipeOffset > 150) {
      if (swipeNoteId && window.confirm("Delete this note?")) {
        deleteNote(swipeNoteId);
      }
    }
    setSwipeNoteId(null);
    setSwipeOffset(0);
  };

  const activeNote = notes.find(n => n.id === selectedNoteId);
  const filteredNotes = notes.filter(n => n.folderId === selectedFolderId);

  return (
    <div className="h-full flex flex-col md:flex-row bg-transparent overflow-hidden">
      {/* Sidebar - Mobile: Hidden when note selected */}
      <div className={`
        ${selectedNoteId ? 'hidden md:flex' : 'flex'}
        w-full md:w-80
        flex-col border-r border-white/10 transition-all duration-300 glass-panel md:rounded-l-2xl my-2 ml-2
      `}>
        <div className="p-4 flex items-center justify-between border-b border-white/10 bg-white/5">
          <h2 className="font-bold uppercase tracking-wider text-xs text-accent">The Vault</h2>
          <button onClick={createNote} className="p-2 hover:bg-accent/20 text-accent rounded-full transition-colors">
            <Plus size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          {filteredNotes.length === 0 ? (
             <div className="p-8 text-center text-muted text-xs font-mono uppercase mt-10 opacity-60">
                Empty Sector
             </div>
          ) : (
            filteredNotes.map(note => (
              <div key={note.id} className="relative overflow-hidden group">
                 <div className="absolute inset-0 bg-red-900/50 flex items-center justify-start pl-6 z-0">
                    <Trash2 className="text-white" size={24} />
                 </div>
                 
                 <div
                    onClick={() => setSelectedNoteId(note.id)}
                    onTouchStart={(e) => onTouchStart(e, note.id)}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    style={{ 
                        transform: swipeNoteId === note.id ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                        transition: swipeNoteId === note.id ? 'none' : 'transform 0.3s ease-out'
                    }}
                    className={`relative z-10 p-5 cursor-pointer border-b border-white/10 hover:bg-white/5 transition-colors backdrop-blur-md bg-transparent ${selectedNoteId === note.id ? 'bg-white/10 border-l-2 border-l-accent' : 'border-l-2 border-l-transparent'}`}
                  >
                    <h3 className={`font-bold text-sm truncate mb-1 transition-colors ${selectedNoteId === note.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                      {note.title || 'Untitled'}
                    </h3>
                    <p className="text-[10px] text-muted font-mono uppercase">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className={`flex-1 flex flex-col h-full relative animate-in fade-in ${!selectedNoteId ? 'hidden md:flex' : 'flex'} m-2 glass-panel md:rounded-r-2xl border-l-0`}>
        {!activeNote ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted font-mono uppercase tracking-widest text-xs opacity-50">
            <BrainCircuit size={48} className="mb-4 stroke-1 text-accent opacity-50"/>
            Select or Create File
          </div>
        ) : (
          <>
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-4 bg-white/5 backdrop-blur-xl sticky top-0 z-20 shrink-0 gap-2 rounded-t-2xl">
               <div className="flex items-center gap-3 flex-1 min-w-0">
                 <button onClick={() => setSelectedNoteId(null)} className="md:hidden p-2 -ml-2 text-muted hover:text-white">
                    <ArrowLeft size={20} />
                 </button>
                 <input
                    value={activeNote.title}
                    onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                    className="text-lg md:text-xl font-bold bg-transparent outline-none placeholder-gray-600 w-full text-white truncate"
                    placeholder="UNTITLED ENTRY"
                  />
               </div>
               
               <div className="flex items-center gap-2">
                 <div className="relative group">
                    <button
                        onClick={handleSmartSummary}
                        disabled={isSummarizing}
                        onMouseEnter={() => setShowAiTooltip(true)}
                        onMouseLeave={() => setShowAiTooltip(false)}
                        className="glass-button flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-4 py-2 hover:text-accent text-gray-300 rounded-lg shrink-0"
                    >
                        {isSummarizing ? <Loader2 size={16} className="animate-spin text-accent"/> : <BrainCircuit size={16} />}
                        <span className="hidden sm:inline">AI Summary</span>
                    </button>
                    {showAiTooltip && (
                        <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-black border border-white/10 rounded text-[10px] text-gray-300 z-50 shadow-xl">
                            Auto-summarize this note using Gemini AI.
                        </div>
                    )}
                 </div>
                 
                 <button 
                  onClick={(e) => handleDeleteClick(e, activeNote.id)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                  title="Delete Note"
                 >
                   <Trash2 size={18} />
                 </button>
               </div>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
              <RichEditor
                content={activeNote.content}
                onChange={(content) => updateNote(activeNote.id, { content })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Vault;