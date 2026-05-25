/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client, Appointment, PaymentStatus, ProjectProgress } from '../types';
import { 
  formatCurrency, 
  generateWhatsAppMessage, 
  formatWhatsAppLink, 
  exportClientsToText, 
  filterClientsByTab 
} from '../utils';
import { 
  Search, 
  Download, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  Trash2, 
  Edit3, 
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  appointments: Appointment[];
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onUpdateProgress: (clientId: string, newProgress: ProjectProgress) => void;
}

export function ClientList({
  clients,
  appointments,
  activeTab,
  onActiveTabChange,
  onEditClient,
  onDeleteClient,
  onUpdateProgress
}: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientMessage, setSelectedClientMessage] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [isCopiedText, setIsCopiedText] = useState(false);
  const [isExportedText, setIsExportedText] = useState<string | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  const tabFiltered = filterClientsByTab(clients, activeTab, appointments);

  const finalFiltered = tabFiltered.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.contact.toLowerCase().includes(term) ||
      c.service.toLowerCase().includes(term) ||
      (c.observations && c.observations.toLowerCase().includes(term))
    );
  });

  const handleCopyMessage = (client: Client) => {
    const decodedMessage = decodeURIComponent(generateWhatsAppMessage(client));
    navigator.clipboard.writeText(decodedMessage).then(() => {
      setSelectedClientName(client.name);
      setSelectedClientMessage(decodedMessage);
      setIsCopiedText(true);
      setTimeout(() => setIsCopiedText(false), 3000);
    });
  };

  const handleOpenWhatsAppDirect = (client: Client) => {
    const message = generateWhatsAppMessage(client);
    const link = formatWhatsAppLink(client.contact, message);
    window.open(link, '_blank');
  };

  const handleExportAll = () => {
    const fullTextReport = exportClientsToText(clients);
    navigator.clipboard.writeText(fullTextReport).then(() => {
      setIsExportedText(fullTextReport);
      setTimeout(() => setIsExportedText(null), 5000);
    });
  };

  const paymentStyleMap: Record<PaymentStatus, { text: string; bg: string; border: string; label: string }> = {
    pago: { 
      text: 'text-emerald-400', 
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-500/20', 
      label: 'PAGO' 
    },
    em_aberto: { 
      text: 'text-rose-400', 
      bg: 'bg-rose-950/40',
      border: 'border-rose-500/20', 
      label: 'ABERTO' 
    },
    pago_parcial: { 
      text: 'text-amber-400', 
      bg: 'bg-amber-950/40',
      border: 'border-amber-500/20', 
      label: 'PARCIAL' 
    },
    fixo_mensal: { 
      text: 'text-blue-400', 
      bg: 'bg-blue-950/40',
      border: 'border-blue-500/20', 
      label: 'RECORRENTE' 
    }
  };

  const progressLabelMap: Record<ProjectProgress, string> = {
    roteiro: 'Roteiro',
    gravado: 'Gravado',
    editado: 'Editado',
    entregue: 'Entregue'
  };

  return (
    <div className="space-y-6" id="client-list-section-container">
      {/* Abas e Filtros */}
      <div className="flex flex-col gap-4" id="filters-container">
        
        {/* Horizontal Navigation Grid */}
        <div className="flex gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-900 overflow-x-auto whitespace-nowrap scrollbar-none" id="list-tabs-container">
          {[
            { id: 'todos', label: 'Todos', count: clients.length },
            { id: 'semana', label: 'Na Semana', count: filterClientsByTab(clients, 'semana', appointments).length },
            { id: 'fixos', label: 'Fixos', count: clients.filter(c => c.paymentStatus === 'fixo_mensal').length },
            { id: 'pagos_tudo', label: 'Pagos', count: clients.filter(c => c.paymentStatus === 'pago').length },
            { id: 'pagos_parcial', label: 'Parciais', count: clients.filter(c => c.paymentStatus === 'pago_parcial').length },
            { id: 'em_aberto', label: 'Abertos', count: clients.filter(c => c.paymentStatus === 'em_aberto').length }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onActiveTabChange(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center gap-2 cursor-pointer ${isActive ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                id={`tab-button-${tab.id}`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${isActive ? 'bg-black/10 text-black' : 'bg-zinc-900 text-zinc-500'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Busca */}
        <div className="flex items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-zinc-500">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Filtre contratos, serviços, WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-950 text-white placeholder-zinc-500 border border-zinc-900 rounded-xl text-xs outline-none focus:border-zinc-700 transition font-sans"
              id="client-search-input"
            />
          </div>
        </div>
      </div>

      {isExportedText && (
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-xs flex flex-col items-start justify-between gap-2 animate-fade-in" id="export-success-banner">
          <p className="font-sans leading-relaxed text-zinc-300"><strong>Relatório Compilado!</strong> O texto de cobrança consolidado foi copiado para a sua área de transferência.</p>
          <button 
            onClick={() => {
              const el = document.getElementById('export-text-area');
              if (el) el.classList.toggle('hidden');
            }}
            className="px-2.5 py-1 text-[9px] bg-white text-black font-extrabold uppercase tracking-wider rounded hover:bg-zinc-100 self-end cursor-pointer"
          >
            Visualizar Texto
          </button>
        </div>
      )}

      <textarea
        readOnly
        id="export-text-area"
        className="hidden w-full h-40 p-3 mt-1 text-zinc-300 bg-black text-xs font-mono rounded-xl border border-zinc-900 focus:outline-none"
        value={exportClientsToText(clients)}
      />

      {/* Feedback de Copia de WhatsApp Cobrança */}
      {selectedClientMessage && (
        <div className="p-4 rounded-[28px] bg-zinc-950 border border-zinc-900 text-white text-xs space-y-3 animate-fade-in" id="whatsapp-message-copy-toast">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-white text-[10px] uppercase tracking-wider flex items-center gap-1.5 font-sans">
              Mensagem de Cobrança:
            </h4>
            <span className="text-[9px] bg-zinc-900 px-2.5 py-0.5 rounded font-mono font-bold text-zinc-400">
              {isCopiedText ? 'COPIADA' : 'SINCROMÍDIA'}
            </span>
          </div>
          <p className="bg-[#0D0D0F] p-3.5 rounded-xl border border-zinc-900 text-[11px] font-sans text-zinc-400 italic leading-relaxed">
            {selectedClientMessage}
          </p>
          <div className="flex justify-end gap-2 pt-1 font-sans">
            <button 
              onClick={() => setSelectedClientMessage(null)}
              className="text-[9px] font-black uppercase tracking-wider text-zinc-500 hover:text-white px-2 py-1 select-none cursor-pointer"
            >
              Fechar
            </button>
            <button 
              onClick={() => handleOpenWhatsAppDirect(clients.find(c => c.name === selectedClientName)!)}
              className="text-[9px] font-black uppercase tracking-wider text-black bg-white hover:bg-zinc-200 px-3 py-1.5 rounded-lg border-none transition cursor-pointer flex items-center gap-1"
            >
              <span>Enviar via WhatsApp</span>
              <ExternalLink className="w-3 h-3 text-black" />
            </button>
          </div>
        </div>
      )}

      {/* Lista Principal */}
      {finalFiltered.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 bg-zinc-950 rounded-3xl border border-dashed border-zinc-900" id="empty-list-message">
          <p className="mt-3 text-xs font-black uppercase tracking-wider text-white font-sans">Nenhuma entrada encontrada</p>
          <p className="mt-1 text-[10px] text-zinc-500 font-sans">Sua busca ou filtro atual não retornou resultados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4" id="clients-cards-grid">
          {finalFiltered.map(client => {
            const style = paymentStyleMap[client.paymentStatus] || paymentStyleMap.em_aberto;
            const outstanding = client.totalValue - client.paidValue;
            return (
              <div
                key={client.id}
                className="p-5 rounded-[28px] bg-zinc-900 border border-zinc-800 shadow-lg hover:border-zinc-700 transition duration-300 flex flex-col justify-between space-y-4"
                id={`client-card-${client.id}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-white text-sm hover:text-zinc-300 transition tracking-wide font-sans">
                        {client.name}
                      </h3>
                      <p className="text-[10px] font-semibold text-zinc-400 mt-0.5 font-sans">
                        {client.service}
                      </p>
                    </div>
                    {/* Status de Pagamento Colorido */}
                    <span className={`text-[8px] font-black tracking-widest px-2.5 py-1 rounded-full border shrink-0 ${style.text} ${style.bg} ${style.border} font-sans`}>
                      {style.label}
                    </span>
                  </div>

                  {/* Informações Financeiras e Contato */}
                  <div className="grid grid-cols-2 gap-3 mt-3 bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                    <div>
                      <span className="text-[8px] font-black text-zinc-500 block uppercase tracking-wider font-sans">
                        Financeiro
                      </span>
                      <p className="text-xs font-black text-white mt-0.5 font-sans">
                        {formatCurrency(client.totalValue)}
                      </p>
                      {outstanding > 0 ? (
                        <p className="text-[9px] font-bold text-rose-400 mt-0.5 font-sans">
                          A pagar: {formatCurrency(outstanding)}
                        </p>
                      ) : (
                        <p className="text-[9px] font-bold text-emerald-400 mt-0.5 font-sans">
                          RECONCILIADO
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-[8px] font-black text-zinc-500 block uppercase tracking-wider font-sans">
                        Contato
                      </span>
                      <a
                        href={formatWhatsAppLink(client.contact)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-black text-white hover:underline inline-flex items-center gap-1 mt-0.5 font-sans"
                      >
                        {client.contact}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Linha de Progresso do Projeto Interativa */}
                <div className="space-y-1 bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                  <span className="text-[8px] font-black tracking-wider text-zinc-500 block mb-1.5 uppercase font-sans">
                    Fase: <span className="text-white font-extrabold">{progressLabelMap[client.progress]}</span>
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'roteiro', label: 'Roteiro' },
                      { id: 'gravado', label: 'Gravado' },
                      { id: 'editado', label: 'Editado' },
                      { id: 'entregue', label: 'Entregue' }
                    ].map((step, sIdx) => {
                      const steps = ['roteiro', 'gravado', 'editado', 'entregue'];
                      const currentIdx = steps.indexOf(client.progress);
                      const isCompleted = sIdx <= currentIdx;
                      
                      const barColor = isCompleted 
                        ? (client.progress === 'entregue' ? 'bg-emerald-500' : 'bg-white')
                        : 'bg-zinc-800';

                      return (
                        <button
                          key={step.id}
                          onClick={() => onUpdateProgress(client.id, step.id as ProjectProgress)}
                          className="group relative cursor-pointer outline-none"
                          title={`Mudar para etapa: ${step.label}`}
                          type="button"
                          id={`progress-bar-btn-${client.id}-${step.id}`}
                        >
                          <div className={`h-1 rounded-full transition-all duration-350 ${barColor}`} />
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition duration-150 text-[8px] bg-black text-white px-1.5 py-0.5 rounded border border-zinc-800 z-10 whitespace-nowrap">
                            {step.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {client.observations && (
                  <p className="text-[10px] text-zinc-400 italic bg-zinc-950 p-2.5 rounded-xl border border-zinc-850 font-sans leading-relaxed">
                    &ldquo;{client.observations}&rdquo;
                  </p>
                )}

                {/* Rodapé do Card */}
                <div className="flex items-center justify-between border-t border-zinc-850 pt-3">
                  <div className="flex gap-1.5">
                    {/* Botão Mensagem WhatsApp */}
                    <button
                      onClick={() => handleCopyMessage(client)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white border border-zinc-850 text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 font-sans"
                      id={`client-copy-wa-message-btn-${client.id}`}
                    >
                      <MessageSquare className="w-3 h-3 text-zinc-400" />
                      <span>Cobrança</span>
                    </button>
                    {/* Botão whats direto */}
                    <button
                      onClick={() => handleOpenWhatsAppDirect(client)}
                      className="p-1.5 px-2.5 rounded-lg bg-emerald-950/20 hover:bg-emerald-950/50 text-emerald-400 text-[10px] uppercase font-black tracking-wider border border-emerald-500/10 transition cursor-pointer flex items-center gap-1"
                      id={`client-direct-wa-btn-${client.id}`}
                    >
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 font-sans">
                    {deletingClientId === client.id ? (
                      <div className="flex items-center gap-1 bg-rose-950/10 border border-rose-900/20 p-0.5 px-1.5 rounded-lg animate-fade-in shrink-0">
                        <span className="text-[9px] font-black text-rose-500 mr-1 uppercase">Remover?</span>
                        <button
                          onClick={() => {
                            onDeleteClient(client.id);
                            setDeletingClientId(null);
                          }}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-black uppercase border-none cursor-pointer transition active:scale-95"
                          id={`client-delete-confirm-yes-${client.id}`}
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setDeletingClientId(null)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[9px] font-black uppercase border-none cursor-pointer transition"
                          id={`client-delete-confirm-no-${client.id}`}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onEditClient(client)}
                          className="px-2.5 py-1.5 rounded-lg text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-wider transition hover:bg-zinc-800"
                          id={`client-edit-btn-${client.id}`}
                        >
                          <Edit3 className="w-3 h-3 inline mr-1" />
                          Editar
                        </button>
                        <button
                          onClick={() => setDeletingClientId(client.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-450 hover:bg-zinc-800 transition cursor-pointer"
                          id={`client-delete-btn-${client.id}`}
                          title="Remover Cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
