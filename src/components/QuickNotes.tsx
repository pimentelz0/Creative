/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { saveQuickNoteToStorage } from '../utils';
import { saveNoteToSupabase } from '../supabaseClient';

interface QuickNotesProps {
  initialNote: Note;
}

export function QuickNotes({ initialNote }: QuickNotesProps) {
  const [content, setContent] = useState(initialNote.content);
  const [saveStatus, setSaveStatus] = useState<'salvo' | 'digitando'>('salvo');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  const getFormattedTime = () => {
    const d = new Date();
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  useEffect(() => {
    if (initialNote.updatedAt) {
      const d = new Date(initialNote.updatedAt);
      setLastSavedTime(d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } else {
      setLastSavedTime(getFormattedTime());
    }
  }, [initialNote]);

  useEffect(() => {
    if (content === initialNote.content) return;

    setSaveStatus('digitando');

    const timeout = setTimeout(async () => {
      const updatedNote: Note = {
        content,
        updatedAt: new Date().toISOString()
      };
      
      saveQuickNoteToStorage(updatedNote);
      await saveNoteToSupabase(updatedNote);
      setSaveStatus('salvo');
      setLastSavedTime(getFormattedTime());
    }, 800);

    return () => clearTimeout(timeout);
  }, [content]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-5 shadow-lg" id="quick-notes-component">
      {/* Cabeçalho do Bloco */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📝</span>
          <div>
            <h3 className="font-extrabold text-white text-sm tracking-wide uppercase font-sans">
              Bloco de Notas Rápidas
            </h3>
            <p className="text-[10px] text-zinc-400 font-sans">
              Escreva ideias de roteiros, pautas, links ou lembretes rápidos.
            </p>
          </div>
        </div>

        {/* Status de salvamento automático */}
        <div className="flex items-center gap-1.5 select-none shrink-0 bg-neutral-950 px-2 py-1 rounded-full border border-zinc-800">
          <span className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'salvo' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
          <span className="text-[8px] font-bold font-mono text-zinc-400 uppercase tracking-widest">
            {saveStatus === 'salvo' ? `Salvo às ${lastSavedTime}` : 'Salvando...'}
          </span>
        </div>
      </div>

      {/* Editor de Texto Simulado Notebook */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Digite seus flashes de ideias de reels, poses ou roteiros aqui...\n\nO Creative salva tudo no seu navegador a cada letra digitada! ✨`}
          className="w-full h-44 py-2 border-0 bg-transparent text-white placeholder-zinc-500 text-xs font-medium focus:ring-0 outline-none leading-relaxed resize-none font-sans"
          id="notes-textarea"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '100% 24px',
            lineHeight: '24px'
          }}
        />
      </div>

      {/* Sugestões ou Atendimento de Lembrete Rápido */}
      <div className="mt-2 text-[9px] text-zinc-400 font-bold flex items-center gap-1 font-sans">
        <span>💡</span>
        <span>As anotações rápidas te ajudam a planejar sem perder insights valiosos.</span>
      </div>
    </div>
  );
}
