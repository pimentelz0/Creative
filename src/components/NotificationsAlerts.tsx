/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Client, Appointment } from '../types';

interface NotificationsAlertsProps {
  clients: Client[];
  appointments: Appointment[];
  onSelectClient?: (clientId: string) => void;
  onNavigateToCalendar?: () => void;
}

export function NotificationsAlerts({
  clients,
  appointments,
  onSelectClient,
  onNavigateToCalendar
}: NotificationsAlertsProps) {
  const unpaidCount = clients.filter(c => c.paymentStatus === 'em_aberto').length;
  const noResponseCount = clients.filter(c => 
    c.observations.toLowerCase().includes('sem retorno') || 
    c.observations.toLowerCase().includes('aguardando briefing') ||
    c.observations.toLowerCase().includes('briefing')
  ).length;
  const pendingDateCount = appointments.filter(app => app.status === 'pendente').length;

  const totalAlerts = (unpaidCount > 0 ? 1 : 0) + (noResponseCount > 0 ? 1 : 0) + (pendingDateCount > 0 ? 1 : 0);

  return (
    <div className="space-y-4 animate-fade-in" id="creative-notifications-section">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-base">🔔</span>
          <h3 className="font-bold text-[#1E1B2E] dark:text-white text-sm tracking-tight font-sans">
            Avisos Importantes {totalAlerts > 0 ? `(${totalAlerts})` : ''}
          </h3>
        </div>
      </div>

      {totalAlerts === 0 ? (
        <div className="py-6 text-center text-neutral-500 bg-white rounded-3xl border border-dashed border-neutral-100 flex flex-col items-center justify-center p-5 shadow-sm">
          <span className="text-2xl">✨</span>
          <p className="mt-2 text-xs font-bold text-[#1E1B2E] font-sans">Tudo em ordem!</p>
          <p className="text-[11px] text-neutral-400 mt-0.5 font-sans">Nenhuma pendência ou cobrança em aberto no momento.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* CARD 1: Pagamentos pendentes */}
          {unpaidCount > 0 && (
            <div 
              id="alert-payments"
              onClick={() => {
                const unpaid = clients.find(c => c.paymentStatus === 'em_aberto');
                if (unpaid && onSelectClient) {
                  onSelectClient(unpaid.id);
                }
              }}
              className="p-5 rounded-[28px] bg-[#FFF1F2] border border-red-200 shadow-md hover:scale-[1.01] transition duration-300 cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="font-bold flex items-center gap-2 text-rose-800 text-xs tracking-wide">
                  <span>💸</span> PAGAMENTOS EM ABERTO
                </div>
                <p className="text-xs text-rose-700 leading-relaxed font-sans mt-2">
                  Você tem {unpaidCount} {unpaidCount === 1 ? 'contrato' : 'contratos'} com pagamento pendente.
                </p>
              </div>
              <div className="text-right text-[11px] font-bold text-rose-700 group-hover:underline transition duration-150 flex items-center justify-end gap-1 font-sans">
                Visualizar cliente &rarr;
              </div>
            </div>
          )}

          {/* CARD 2: Clientes sem retorno */}
          {noResponseCount > 0 && (
            <div 
              id="alert-no-response"
              onClick={() => {
                const match = clients.find(c => 
                  c.observations.toLowerCase().includes('sem retorno') || 
                  c.observations.toLowerCase().includes('aguardando briefing') ||
                  c.observations.toLowerCase().includes('briefing')
                );
                if (match && onSelectClient) {
                  onSelectClient(match.id);
                }
              }}
              className="p-5 rounded-[28px] bg-[#FFFBEB] border border-amber-200 shadow-md hover:scale-[1.01] transition duration-300 cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="font-bold flex items-center gap-2 text-amber-800 text-xs tracking-wide font-sans">
                  <span>⏳</span> AGUARDANDO BRIEFING / RETORNO
                </div>
                <p className="text-xs text-amber-700 leading-relaxed mt-2 font-sans">
                  Há {noResponseCount} {noResponseCount === 1 ? 'cliente que' : 'clientes que'} precisa de retorno ou envio de briefing.
                </p>
              </div>
              <div className="text-right text-[11px] font-bold text-amber-750 group-hover:underline transition duration-150 flex items-center justify-end gap-1 font-sans">
                Ver observações &rarr;
              </div>
            </div>
          )}

          {/* CARD 3: Agendamentos aguardando confirmação */}
          {pendingDateCount > 0 && (
            <div 
              id="alert-pending-date"
              onClick={onNavigateToCalendar}
              className="p-5 rounded-[28px] bg-neutral-100 border border-neutral-200 text-neutral-600 hover:scale-[1.01] hover:text-neutral-850 transition duration-300 cursor-pointer flex flex-col justify-between space-y-2 relative overflow-hidden group"
            >
              <div>
                <div className="font-bold flex items-center gap-2 text-neutral-700 text-xs tracking-wide font-sans">
                  <span>🗓️</span> SESSÕES AGUARDANDO CONFIRMAÇÃO
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed mt-2 font-sans">
                  Você possui {pendingDateCount} {pendingDateCount === 1 ? 'ensaio agendado como pendente' : 'ensaios agendados como pendentes'} de horário.
                </p>
              </div>
              <div className="text-right text-[11px] font-bold text-neutral-600 transition duration-150 flex items-center justify-end gap-1 font-sans">
                Acessar cronograma &rarr;
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
