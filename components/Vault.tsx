import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, BrainCircuit, Loader2, ArrowLeft, Trash2, Share2,
  Check, Download, FileText, Printer, Search, Lock, Unlock,
  Pin, PinOff, Folder, File, Menu, Settings
} from 'lucide-react';
import { Note, Folder as FolderType } from '../types';
import { StorageService } from '../services/storage';
import RichEditor from './RichEditor';
import { GeminiService } from '../services/geminiService';

const Vault: React.FC = () => {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('default');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [showLockedContent, setShowLockedContent] = useState<{ [key: string]: boolean }>({});
  // ^ Transient state to keep notes unlocked during session

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Load Data
  useEffect(() => {
    const load = async () => {
      const f = await StorageService.getFolders();
      setFolders(f);
      const n = await StorageService.getNotes();
      setNotes(n);
    };
    load();
  }, []);

  // --- Actions ---

  const createNote = async () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: '', // Start blank
      content: '',
      folderId: selectedFolderId,
      tags: [],
      updatedAt: Date.now(),
      isPinned: false,
      isLocked: false
    };

    setNotes([newNote, ...notes]);
    setSelectedNoteId(newNote.id);

    await StorageService.addNote(newNote);
  };

  const debounceRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const debouncedSave = useCallback((note: Note) => {
    if (debounceRef.current[note.id]) clearTimeout(debounceRef.current[note.id]);
    setSaveStatus('saving');
    debounceRef.current[note.id] = setTimeout(async () => {
      try {
        await StorageService.updateNote(note);
        setSaveStatus('saved');
      } catch (e) {
        console.error("Save failed", e);
        setSaveStatus('error');
      }
    }, 1000);
  }, []);

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => {
      if (n.id === id) {
        const updated = { ...n, ...updates, updatedAt: Date.now() };
        debouncedSave(updated);
        return updated;
      }
      return n;
    }));
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm("Permanently delete this?")) return;
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNoteId === id) setSelectedNoteId(null);
    await StorageService.deleteNote(id);
  };

  const togglePin = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    updateNote(note.id, { isPinned: !note.isPinned });
  };

  const toggleLock = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    if (note.isLocked) {
      // Provide option to UNLOCK permanently or just open? 
      // For this toggle data-wise, we toggle property.
      const pass = prompt("Enter new password to LOCK this note (or leave empty to UNLOCK):");
      if (pass === null) return;
      if (pass === "") {
        updateNote(note.id, { isLocked: false, password: undefined });
      } else {
        updateNote(note.id, { isLocked: true, password: pass });
      }
    } else {
      const pass = prompt("Create a password to secure this note:");
      if (pass) {
        updateNote(note.id, { isLocked: true, password: pass });
      }
    }
  };

  // --- Filtering ---
  const filteredNotes = notes
    .filter(n => n.folderId === selectedFolderId)
    .filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      // Sort by Pinned then Date
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });

  const activeNote = notes.find(n => n.id === selectedNoteId);

  // --- Unlock Handler ---
  const requestUnlock = (note: Note) => {
    const input = prompt("Enter Password:");
    if (input === note.password) {
      setShowLockedContent(prev => ({ ...prev, [note.id]: true }));
    } else {
      alert("Incorrect Password");
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-transparent overflow-hidden">

      {/* LEFT SIDEBAR: FOLDERS & LIST (Combined for now, can separate if strictly 3-pane requested) */}
      <div className={`
                ${selectedNoteId ? 'hidden md:flex' : 'flex'}
                w-full md:w-96
                flex-col border-r border-white/10 glass-panel md:rounded-l-2xl my-2 ml-2 transition-all duration-300
            `}>
        {/* Search Header */}
        <div className="p-4 border-b border-white/10 bg-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold uppercase tracking-wider text-xs text-accent flex items-center gap-2">
              <Folder size={14} /> The Vault
            </h2>
            <button onClick={createNote} className="p-2 bg-accent/20 text-accent rounded-full hover:bg-accent/30 transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:border-accent outline-none transition-colors"
            />
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center opacity-40">
              <File size={32} className="mx-auto mb-2 text-gray-500" />
              <p className="text-xs font-mono uppercase text-gray-500">No Records Found</p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                onClick={() => {
                  if (note.isLocked && !showLockedContent[note.id]) {
                    requestUnlock(note);
                  } else {
                    setSelectedNoteId(note.id);
                  }
                }}
                className={`
                                    group relative p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-all
                                    ${selectedNoteId === note.id ? 'bg-white/10 border-l-2 border-l-accent' : 'border-l-2 border-l-transparent'}
                                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className={`font-bold text-sm truncate pr-8 ${note.isPinned ? 'text-accent' : 'text-gray-200'}`}>
                    {note.title || 'Untitled Entry'}
                  </h3>
                  {note.isPinned && <Pin size={12} className="text-accent shrink-0" />}
                  {note.isLocked && <Lock size={12} className="text-red-400 shrink-0 ml-2" />}
                </div>
                <p className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                  {new Date(note.updatedAt).toLocaleDateString()}
                  {/* Action Buttons on Hover */}
                  <div className="hidden group-hover:flex items-center gap-2 ml-auto">
                    <button onClick={(e) => togglePin(e, note)} className="hover:text-white transition-colors">
                      {note.isPinned ? <PinOff size={10} /> : <Pin size={10} />}
                    </button>
                    <button onClick={(e) => toggleLock(e, note)} className="hover:text-white transition-colors">
                      {note.isLocked ? <Unlock size={10} /> : <Lock size={10} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }} className="hover:text-red-500 transition-colors">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* EDITOR MAIN */}
      <div className={`flex-1 flex flex-col h-full relative animate-in fade-in ${!selectedNoteId ? 'hidden md:flex' : 'flex'} m-2 glass-panel md:rounded-r-2xl border-l-0`}>
        {!activeNote ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted font-mono uppercase tracking-widest text-xs opacity-30">
            <BrainCircuit size={64} className="mb-4 stroke-1" />
            Select File to Decrypt
          </div>
        ) : (
          <>
            {/* Editor Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-white/5 backdrop-blur-xl sticky top-0 z-20 shrink-0">
              <div className="flex items-center gap-4 flex-1">
                <button onClick={() => setSelectedNoteId(null)} className="md:hidden text-gray-400 hover:text-white">
                  <ArrowLeft size={20} />
                </button>
                <input
                  value={activeNote.title}
                  onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                  className="text-xl font-bold bg-transparent outline-none placeholder-gray-600 text-white w-full"
                  placeholder="TITLE REQUIRED"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Save Status */}
                <div className="hidden sm:flex items-center gap-2 mr-4">
                  {saveStatus === 'saving' ? (
                    <Loader2 size={12} className="animate-spin text-gray-500" />
                  ) : (
                    <Check size={12} className="text-green-500/50" />
                  )}
                  <span className="text-[10px] text-gray-600 font-mono uppercase">{saveStatus}</span>
                </div>

                <button onClick={() => updateNote(activeNote.id, { isPinned: !activeNote.isPinned })} className={`p-2 rounded-lg transition-colors ${activeNote.isPinned ? 'text-accent bg-accent/10' : 'text-gray-400 hover:bg-white/5'}`}>
                  <Pin size={18} />
                </button>
                <button onClick={async () => {
                  setIsSummarizing(true);
                  const summary = await GeminiService.summarizeNote(activeNote.content);
                  setIsSummarizing(false);
                  updateNote(activeNote.id, { content: activeNote.content + `<br/><br/><b>AI SUMMARY:</b><br/>${summary}` });
                }} className="p-2 text-gray-400 hover:text-accent hover:bg-white/5 rounded-lg">
                  {isSummarizing ? <Loader2 size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
                </button>
              </div>
            </div>

            {/* Rich Editor Component */}
            <div className="flex-1 overflow-hidden">
              <RichEditor
                key={activeNote.id} // Re-mount on note switch to clear history/state
                content={activeNote.content}
                onChange={(html) => updateNote(activeNote.id, { content: html })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Vault;