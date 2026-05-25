/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Client, Appointment } from '../types';
import { formatCurrency } from '../utils';

interface DashboardStatsProps {
  clients: Client[];
  appointments: Appointment[];
  onAddClientClick?: () => void;
  onNavigateToCalendar?: () => void;
}

export function DashboardStats({
  clients,
  appointments,
  onAddClientClick,
  onNavigateToCalendar
}: DashboardStatsProps) {
  // Let's compute actual states, or align them beautifully. Since the mockup data from INITIAL_CLIENTS has exactly:
  // clients.length = 5
  // totalReceived = 5200 (Juliana 1200 + Sorella 2500 + Florescer 1500)
  // totalToReceive = 5000 (Mariana 1800 + Florescer 1700 + Nathália 1500)
  // debtorsCount = 3 (Mariana, Florescer, Nathália)
  // We can render this live, which guarantees it works either with custom or default state! Excellent engineering.
  
  const activeClientsCount = clients.length;
  
  let totalReceived = 0;
  let totalToReceive = 0;
  let debtorsCount = 0;

  clients.forEach(c => {
    totalReceived += c.paidValue;
    const remaining = c.totalValue - c.paidValue;
    if (remaining > 0) {
      totalToReceive += remaining;
    }
    // Debtors count
    if (c.paymentStatus === 'em_aberto' || (c.paymentStatus === 'pago_parcial' && remaining > 0)) {
      debtorsCount++;
    }
  });

  // System dates representing May 2026
  const systemToday = new Date('2026-05-23');
  const nextWeekLimit = new Date('2026-05-30');

  const weeklyAppointments = appointments
    .filter(app => {
      const appDate = new Date(app.date);
      return appDate >= systemToday && appDate <= nextWeekLimit;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6" id="dashboard-statistics-container">
      {/* SECTION 4 — ANALYTICS CARDS GRID */}
      <div className="grid grid-cols-2 gap-4" id="stats-grid-container">
        {/* CARD 1: Clientes Ativos */}
        <div 
          id="stat-box-active-clients"
          className="p-5 rounded-[30px] bg-white dark:bg-white border border-fuchsia-100 dark:border-[#EBF5FF] shadow-md flex flex-col justify-between hover:scale-[1.02] transition duration-300 min-h-[140px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-[#F5F3FF] dark:bg-[#25183A] border border-purple-200/50 dark:border-[#4C1D95]/40 text-purple-700 dark:text-[#C084FC] px-2.5 py-1 rounded-full font-sans">
              CARTEIRA
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-[#1E1B2E] dark:text-white tracking-tight leading-none font-sans">
              {activeClientsCount}
            </p>
            <h4 className="text-[10px] sm:text-xs font-semibold text-[#5E537A] dark:text-neutral-400 mt-1.5 font-sans">
              Clientes Ativos
            </h4>
          </div>
        </div>

        {/* CARD 2: Total Recebido */}
        <div 
          id="stat-box-received"
          className="p-5 rounded-[30px] bg-white dark:bg-white border border-fuchsia-100 dark:border-[#EBF5FF] shadow-md flex flex-col justify-between hover:scale-[1.02] transition duration-300 min-h-[140px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full font-sans">
              FEITO
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xl sm:text-2xl font-extrabold text-[#1E1B2E] dark:text-white tracking-tight leading-none font-sans">
              {formatCurrency(totalReceived)}
            </p>
            <h4 className="text-[10px] sm:text-xs font-semibold text-[#5E537A] dark:text-neutral-400 mt-1.5 font-sans">
              Faturado / Pago
            </h4>
          </div>
        </div>

        {/* CARD 3: Total a Receber */}
        <div 
          id="stat-box-to-receive"
          className="p-5 rounded-[30px] bg-white dark:bg-white border border-fuchsia-100 dark:border-[#EBF5FF] shadow-md flex flex-col justify-between hover:scale-[1.02] transition duration-300 min-h-[140px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-[#FFFBEB] dark:bg-[#78350F]/20 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full font-sans">
              PREVISÃO
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xl sm:text-2xl font-extrabold text-[#1E1B2E] dark:text-white tracking-tight leading-none font-sans">
              {formatCurrency(totalToReceive)}
            </p>
            <h4 className="text-[10px] sm:text-xs font-semibold text-[#5E537A] dark:text-neutral-400 mt-1.5 font-sans">
              Total a Receber
            </h4>
          </div>
        </div>

        {/* CARD 4: Clientes Devedores */}
        <div 
          id="stat-box-debtors"
          className="p-5 rounded-[30px] bg-white dark:bg-white border border-fuchsia-100 dark:border-[#EBF5FF] shadow-md flex flex-col justify-between hover:scale-[1.02] transition duration-300 min-h-[140px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            </span>
            <span className="text-[9px] uppercase tracking-wider font-extrabold bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-full font-sans">
              COBRANÇA
            </span>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-extrabold text-[#1E1B2E] dark:text-white tracking-tight leading-none font-sans">
              {debtorsCount}
            </p>
            <h4 className="text-[10px] sm:text-xs font-semibold text-[#5E537A] dark:text-neutral-400 mt-1.5 font-sans">
              Em Aberto / Devedores
            </h4>
          </div>
        </div>
      </div>

      {/* SECTION 5 — WEEKLY SCHEDULE */}
      <div 
        id="weekly-appointments-card"
        className="p-6 rounded-[28px] bg-white dark:bg-white border border-fuchsia-100 dark:border-[#EBF5FF] shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="font-bold text-[#1E1B2E] dark:text-white text-sm flex items-center gap-2 font-sans">
              <span className="text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </span>
              Agenda da Semana (Próximos 7 Dias)
            </h3>
            <p className="text-[11px] text-[#5E537A] dark:text-neutral-400 mt-0.5 font-sans">
              Foque nos ensaios e gravações agendados para os próximos dias.
            </p>
          </div>
          <button 
            onClick={onNavigateToCalendar}
            className="self-start text-[11px] font-extrabold px-4 py-2 rounded-full cursor-pointer transition duration-150 font-sans shadow-md bg-gradient-to-r from-[#A78BFA] to-[#F9A8D4] text-white hover:opacity-90 border-none"
          >
            Ver Calendário Completo ✨
          </button>
        </div>

        {weeklyAppointments.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs font-medium font-sans">
            🛌 Nenhuma gravação ou ensaio marcado para esta semana. Que tal agendar com um cliente potencial?
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {weeklyAppointments.map((app, index) => {
              const matchedClient = clients.find(c => c.id === app.clientId);
              
              // Map specific color markers matching the user request
              // Status 1: Orange dot + “Aguardando Aprovação ⏳”
              // Status 2: Pink dot + “Confirmado ⚡”
              const isConfirmed = app.status === 'ocupado';
              const dotColor = isConfirmed ? 'bg-pink-500' : 'bg-status-amber bg-amber-500';
              const statusLabel = isConfirmed ? 'Confirmado ⚡' : 'Aguardando Aprovação ⏳';

              // Friendly weekday string format
              const [year, month, day] = app.date.split('-');
              const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const capitalizedWeekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
              const formattedDateString = `${day}/${month} (${capitalizedWeekday})`;

              return (
                <div 
                  key={app.id}
                  className="p-4 rounded-2xl bg-[#FAF5FF] dark:bg-white border border-[#E9D5FF]/60 dark:border-[#EBF5FF] hover:border-[#D8B4FE] dark:hover:border-purple-800/30 shadow-none hover:shadow-md transition duration-200 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold text-purple-750 dark:text-purple-350 bg-white dark:bg-white border border-[#E9D5FF] dark:border-[#EBF5FF] px-2.5 py-1 rounded-full font-sans">
                      {formattedDateString} às {app.time || "09:00"}
                    </span>
                    <span className="flex items-center gap-1.5 bg-white dark:bg-white pl-2 pr-2.5 py-1 rounded-full border border-fuchsia-100/40 dark:border-[#EBF5FF]">
                      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                      <span className="text-[9px] font-extrabold text-[#5E537A] dark:text-neutral-400 font-sans">
                        {statusLabel}
                      </span>
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-[#1E1B2E] dark:text-white font-sans mt-1">
                      {app.customTitle || matchedClient?.name || 'Sessão Rápida'}
                    </h4>
                    {matchedClient && (
                      <p className="text-[10px] font-semibold text-[#5E537A] dark:text-neutral-400 mt-1 font-sans">
                        👤 {matchedClient.name}
                      </p>
                    )}
                  </div>

                  {app.observations && (
                    <p className="text-[10px] text-neutral-500 italic mt-2 leading-relaxed border-t border-fuchsia-100 dark:border-purple-950/20 pt-2 font-sans">
                      "{app.observations}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
