/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client, Appointment, AppointmentStatus } from '../types';

interface VisualCalendarProps {
  clients: Client[];
  appointments: Appointment[];
  onAddAppointment: (appointment: Omit<Appointment, 'id'> & { id?: string }) => void;
  onDeleteAppointment: (id: string) => void;
}

export function VisualCalendar({
  clients,
  appointments,
  onAddAppointment,
  onDeleteAppointment
}: VisualCalendarProps) {
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const savedYear = localStorage.getItem('cliboard_calendar_last_year');
    if (savedYear) return parseInt(savedYear, 10);
    return new Date().getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const savedMonth = localStorage.getItem('cliboard_calendar_last_month');
    if (savedMonth) return parseInt(savedMonth, 10);
    return new Date().getMonth();
  });
  
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  
  const [apptTime, setApptTime] = useState('14:00');
  const [apptClientId, setApptClientId] = useState('none');
  const [apptTitle, setApptTitle] = useState('');
  const [apptStatus, setApptStatus] = useState<AppointmentStatus>('ocupado');
  const [apptObs, setApptObs] = useState('');
  const [apptError, setApptError] = useState<string | null>(null);
  const [deletingApptId, setDeletingApptId] = useState<string | null>(null);

  const MONTHS_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const saveYearMonth = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    localStorage.setItem('cliboard_calendar_last_year', String(year));
    localStorage.setItem('cliboard_calendar_last_month', String(month));
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      saveYearMonth(currentYear - 1, 11);
    } else {
      saveYearMonth(currentYear, currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      saveYearMonth(currentYear + 1, 0);
    } else {
      saveYearMonth(currentYear, currentMonth + 1);
    }
  };

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const startDayOffset = firstDayOfMonth.getDay(); 
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const dayCells: { dateString: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

  const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = startDayOffset - 1; i >= 0; i--) {
    const prevDay = totalDaysInPrevMonth - i;
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYearVal = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevYearVal}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`;
    dayCells.push({
      dateString: dateStr,
      dayNumber: prevDay,
      isCurrentMonth: false
    });
  }

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayCells.push({
      dateString: dateStr,
      dayNumber: d,
      isCurrentMonth: true
    });
  }

  const remainingCellsCount = (dayCells.length % 7 === 0) ? 0 : 7 - (dayCells.length % 7);
  for (let n = 1; n <= remainingCellsCount; n++) {
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYearVal = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextYearVal}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
    dayCells.push({
      dateString: dateStr,
      dayNumber: n,
      isCurrentMonth: false
    });
  }

  const handleDayClick = (dateString: string) => {
    setSelectedDateStr(dateString);
    setIsPopupOpen(true);
    setApptError(null);
    setApptTime('14:00');
    setApptClientId('none');
    setApptTitle('');
    setApptStatus('ocupado');
    setApptObs('');
  };

  const handleCreateAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApptError(null);

    if (!selectedDateStr) return;

    if (!apptTitle.trim() && apptClientId === 'none') {
      setApptError('Escolha uma cliente vinculada ou preencha uma descrição resumida da sessão.');
      return;
    }

    onAddAppointment({
      clientId: apptClientId,
      customTitle: apptTitle.trim(),
      date: selectedDateStr,
      status: apptStatus,
      time: apptTime,
      observations: apptObs.trim()
    });

    setApptTitle('');
    setApptTime('14:00');
    setApptObs('');
  };

  const getAppointmentsForDate = (dateString: string) => {
    return appointments.filter(app => app.date === dateString);
  };

  const getDayStatusStyle = (dateString: string) => {
    const dayAppts = getAppointmentsForDate(dateString);
    if (dayAppts.length === 0) {
      return {
        bg: 'bg-[#FAF5FF]/70 dark:bg-neutral-900 hover:bg-[#F3E8FF] dark:hover:bg-neutral-850 text-purple-900 dark:text-neutral-400 border-[#E9D5FF] dark:border-neutral-800/45',
        text: 'text-[#5E537A] dark:text-neutral-400',
        statusCircle: 'bg-emerald-500',
        statusLabel: 'Livre'
      };
    }

    const hasOcupado = dayAppts.some(app => app.status === 'ocupado');
    if (hasOcupado) {
      return {
        bg: 'bg-[#FFF1F2] dark:bg-[#21090F] hover:bg-rose-100 dark:hover:bg-[#2D0B14] text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-950/65',
        text: 'text-rose-700 dark:text-rose-400',
        statusCircle: 'bg-rose-500',
        statusLabel: 'Fechada (Ocupado)'
      };
    }

    const hasPendente = dayAppts.some(app => app.status === 'pendente');
    if (hasPendente) {
      return {
        bg: 'bg-[#FFFBEB] dark:bg-[#1E1106] hover:bg-amber-100 dark:hover:bg-[#2B1708] text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-950/65',
        text: 'text-amber-700 dark:text-amber-400',
        statusCircle: 'bg-amber-500',
        statusLabel: 'Pendente'
      };
    }

    return {
      bg: 'bg-emerald-50 dark:bg-[#06120A] hover:bg-emerald-100 dark:hover:bg-[#0B1E11] text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-950/65',
      text: 'text-emerald-700 dark:text-emerald-400',
      statusCircle: 'bg-emerald-500',
      statusLabel: 'Disponível'
    };
  };

  return (
    <div className="bg-white dark:bg-white border border-fuchsia-100 dark:border-[#EBF5FF] rounded-[28px] p-5 shadow-md" id="visual-calendar-component">
      {/* Cabeçalho do Calendário */}
      <div className="flex flex-col gap-4 border-b border-fuchsia-100 dark:border-purple-950/20 pb-5 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🗓️</span>
            <div>
              <h3 className="font-extrabold text-[#1E1B2E] dark:text-white text-sm tracking-tight font-sans">
                Calendário Editorial de Agendamentos
              </h3>
              <p className="text-[10px] text-[#5E537A] dark:text-neutral-400 font-sans">
                Toque em qualquer data para reservar ou alterar ensaios e gravações.
              </p>
            </div>
          </div>
        </div>

        {/* Seletores de Mês */}
        <div className="flex items-center gap-1.5 self-start sm:self-center font-sans">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl text-[10px] font-black bg-[#FAF5FF] dark:bg-neutral-950 hover:bg-fuchsia-50 dark:hover:bg-neutral-800 text-purple-700 dark:text-neutral-300 border border-[#DDD6FE] dark:border-neutral-800"
            id="calendar-nav-prev"
          >
            &larr; Voltar
          </button>
          <span className="text-xs font-black px-4 py-2 rounded-xl bg-[#F5F3FF] dark:bg-neutral-950 text-purple-900 dark:text-white border border-[#DDD6FE]/60 dark:border-neutral-800 select-none min-w-[120px] text-center">
            {MONTHS_PT[currentMonth]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl text-[10px] font-black bg-[#FAF5FF] dark:bg-neutral-950 hover:bg-fuchsia-50 dark:hover:bg-neutral-800 text-purple-700 dark:text-neutral-300 border border-[#DDD6FE] dark:border-neutral-800"
            id="calendar-nav-next"
          >
            Avançar &rarr;
          </button>
        </div>
      </div>

      {/* Legenda de cores */}
      <div className="flex flex-col gap-2 text-[9px] font-bold text-neutral-400 mb-4 bg-[#FAF5FF]/80 dark:bg-white p-3 rounded-2xl border border-fuchsia-100/60 dark:border-[#EBF5FF]" id="calendar-colors-legend font-sans">
        <span className="text-[10px] text-purple-900/60 dark:text-neutral-500 uppercase tracking-wider font-extrabold font-sans">Legenda de Status:</span>
        <div className="flex flex-wrap gap-2 font-sans">
          <span className="flex items-center gap-1.5 bg-[#FFF1F2] dark:bg-[#21090F] px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-950 text-rose-800 dark:text-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Ocupado
          </span>
          <span className="flex items-center gap-1.5 bg-[#FFFBEB] dark:bg-[#1E1106] px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-950 text-amber-800 dark:text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pendente
          </span>
          <span className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-900 px-2.5 py-1 rounded-xl border border-neutral-200 dark:border-neutral-800 text-purple-800/85 dark:text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Livre
          </span>
        </div>
      </div>

      {/* Grade de Dias */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" id="calendar-days-grid">
        {WEEKDAYS_PT.map(day => (
          <div
            key={day}
            className="text-[9px] sm:text-[10px] font-black text-neutral-500 text-center py-1 uppercase tracking-wider select-none font-sans"
          >
            {day}
          </div>
        ))}

        {dayCells.map((cell, idx) => {
          const style = getDayStatusStyle(cell.dateString);
          const dayAppts = getAppointmentsForDate(cell.dateString);
          const isTodaySystem = cell.dateString === '2026-05-23';

          return (
            <div
              key={`${cell.dateString}-${idx}`}
              onClick={() => handleDayClick(cell.dateString)}
              className={`min-h-[55px] sm:min-h-[70px] p-2 rounded-xl border transition duration-150 cursor-pointer flex flex-col justify-between ${style.bg} ${cell.isCurrentMonth ? '' : 'opacity-25 text-neutral-400'} ${isTodaySystem ? 'ring-2 ring-purple-650 border-[#7C3AED] dark:ring-2 dark:ring-purple-650 dark:border-[#7C3AED] scale-[1.03]' : 'border-fuchsia-100/70 dark:border-[#EBF5FF]'}`}
              id={`calendar-cell-${cell.dateString}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-black text-[#1E1B2E] dark:text-white font-sans">
                  {cell.dayNumber}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${style.statusCircle} shrink-0`} />
              </div>

              {dayAppts.length > 0 && (
                <div className="hidden sm:block space-y-0.5 mt-1">
                  {dayAppts.slice(0, 1).map(app => {
                    const matched = clients.find(c => c.id === app.clientId);
                    return (
                      <p 
                        key={app.id}
                        className="text-[8px] font-bold leading-tight truncate p-0.5 rounded bg-white dark:bg-white text-purple-950 dark:text-purple-900 border border-fuchsia-150/40 dark:border-[#EBF5FF] font-sans shadow-sm"
                      >
                        {app.time ? `${app.time} ` : ''}
                        {app.customTitle || matched?.name || 'Sessão'}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* POPUP / DIALOG DO DIA SELECIONADO */}
      {isPopupOpen && selectedDateStr && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in"
          id="calendar-popup-overlay"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-white rounded-3xl p-6 border border-fuchsia-100 dark:border-[#EBF5FF] shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setIsPopupOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-[#5E537A] hover:text-[#1E1B2E] dark:text-neutral-400 dark:hover:text-white transition cursor-pointer text-xs"
              id="close-popup-btn"
            >
              ✕
            </button>

            {/* Cabeçalho do Popup */}
            <div className="mb-5 border-b border-fuchsia-100 dark:border-purple-950/20 pb-3 font-sans">
              <span className="text-[9px] font-bold text-[#7C3AED] dark:text-[#A78BFA] uppercase tracking-widest block">
                Agendamentos do Dia
              </span>
              <h4 className="text-sm font-extrabold text-[#1E1B2E] dark:text-white mt-1">
                {(() => {
                  const [y, m, d] = selectedDateStr.split('-');
                  return `${d} de ${MONTHS_PT[parseInt(m) - 1]} de ${y}`;
                })()}
              </h4>
            </div>

            {/* Lista de Sessões Existentes */}
            <div className="space-y-3 mb-6">
              <h5 className="text-[9px] font-bold text-[#5E537A] dark:text-neutral-500 uppercase tracking-wider block font-sans">
                Reservas Existentes ({getAppointmentsForDate(selectedDateStr).length})
              </h5>

              {getAppointmentsForDate(selectedDateStr).length === 0 ? (
                <div className="text-center py-6 rounded-2xl bg-[#FAF5FF] dark:bg-white border border-[#E9D5FF] dark:border-[#EBF5FF] text-purple-800/80 dark:text-purple-900 text-[11px] font-bold font-sans">
                  🌿 Nenhum ensaio programado para este dia!
                </div>
              ) : (
                <div className="space-y-2">
                  {getAppointmentsForDate(selectedDateStr).map(app => {
                    const linked = clients.find(c => c.id === app.clientId);
                    
                    const statusStylesMap = {
                      ocupado: 'bg-rose-50 dark:bg-rose-950/40 text-rose-850 dark:text-rose-300 border-rose-100 dark:border-rose-500/20',
                      pendente: 'bg-amber-50 dark:bg-amber-950/40 text-amber-850 dark:text-amber-300 border-amber-100 dark:border-amber-500/20',
                      livre: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-850 dark:text-emerald-300 border-emerald-100 dark:border-emerald-500/20'
                    };

                    return (
                      <div
                        key={app.id}
                        className="p-3 bg-[#FAF5FF] dark:bg-neutral-900 border border-fuchsia-100 dark:border-neutral-800 rounded-xl flex items-start justify-between gap-3"
                        id={`calendar-popup-item-${app.id}`}
                      >
                        <div className="font-sans">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {app.time && (
                              <span className="text-[9px] font-extrabold bg-white dark:bg-neutral-950 text-[#1E1B2E] dark:text-neutral-300 px-2 py-0.5 rounded border border-[#E9D5FF] dark:border-[#332B45]">
                                🕐 {app.time}
                              </span>
                            )}
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border ${statusStylesMap[app.status]}`}>
                              {app.status === 'ocupado' ? 'Confirmado ⚡' : app.status === 'pendente' ? 'Pendente ⏳' : 'Livre 🌿'}
                            </span>
                          </div>

                          <h6 className="font-extrabold text-[#1E1B2E] dark:text-white text-xs mt-2">
                            {app.customTitle || linked?.name || 'Sessão Avulsa'}
                          </h6>
                          {linked && (
                            <p className="text-[9px] font-semibold text-[#5E537A] dark:text-neutral-400 mt-1">
                              👤 Cliente: {linked.name}
                            </p>
                          )}
                          {app.observations && (
                            <p className="text-[9px] text-[#5E537A] dark:text-neutral-500 italic mt-1 leading-relaxed">
                              &ldquo;{app.observations}&rdquo;
                            </p>
                          )}
                        </div>

                        {deletingApptId === app.id ? (
                          <div className="flex items-center gap-1.5 shrink-0 animate-fade-in">
                            <button
                              onClick={() => {
                                onDeleteAppointment(app.id);
                                setDeletingApptId(null);
                              }}
                              className="text-[9px] font-bold text-white px-2 py-1 bg-rose-600 hover:bg-rose-700 rounded border-none cursor-pointer transition"
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setDeletingApptId(null)}
                              className="text-[9px] font-bold text-zinc-700 dark:text-zinc-300 px-2 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded border-none cursor-pointer transition"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setDeletingApptId(app.id);
                            }}
                            className="text-[9px] font-bold text-rose-700 hover:text-rose-800 px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 rounded border border-rose-100 dark:border-[#991B1B]/40 shrink-0 cursor-pointer transition"
                          >
                            Apagar 🗑️
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cadastrar Nova Reserva */}
            <div className="bg-[#FAF5FF] dark:bg-neutral-900 p-4 rounded-2xl border border-fuchsia-100 dark:border-neutral-800">
              <h5 className="text-[10px] font-extrabold text-purple-800 dark:text-[#A78BFA] uppercase tracking-wide block mb-3 font-sans">
                ➕ Agendar Nova Sessão / Bloquear
              </h5>

              {apptError && (
                <div className="mb-3 p-2 rounded bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-[10px] font-bold font-sans">
                  ⚠️ {apptError}
                </div>
              )}

              <form onSubmit={handleCreateAppointmentSubmit} className="space-y-3 font-sans">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-[#5E537A] dark:text-neutral-400 block">Horário</label>
                    <input
                      type="text"
                      placeholder="Ex: 14:00"
                      value={apptTime}
                      onChange={(e) => setApptTime(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E9D5FF] bg-white dark:border-neutral-800 dark:bg-[#0A080F] text-xs text-[#1E1B2E] dark:text-white outline-none focus:ring-1 focus:ring-purple-350"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-[#5E537A] dark:text-neutral-400 block">Status</label>
                    <select
                      value={apptStatus}
                      onChange={(e) => setApptStatus(e.target.value as AppointmentStatus)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E9D5FF] bg-white dark:border-neutral-800 dark:bg-[#0A080F] text-xs text-[#1E1B2E] dark:text-white outline-none font-bold focus:ring-1 focus:ring-purple-350"
                    >
                      <option value="ocupado">🔴 Reservado / Ocupado</option>
                      <option value="pendente">🟡 Pendente / Aguardando</option>
                      <option value="livre">🟢 Livre / Disponível</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-[#5E537A] dark:text-neutral-400 block">Cliente Cadastrado</label>
                  <select
                    value={apptClientId}
                    onChange={(e) => {
                      setApptClientId(e.target.value);
                      if (e.target.value !== 'none') {
                        const clientSelected = clients.find(c => c.id === e.target.value);
                        if (clientSelected) {
                          setApptTitle(clientSelected.service);
                        }
                      } else {
                        setApptTitle('');
                      }
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E9D5FF] bg-white dark:border-neutral-800 dark:bg-[#0A080F] text-xs text-[#1E1B2E] dark:text-white outline-none focus:ring-1 focus:ring-purple-350"
                  >
                    <option value="none">-- Sem Vínculo (Bloqueio) --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-[#5E537A] dark:text-neutral-400 block">Resumo / Título</label>
                  <input
                    type="text"
                    placeholder="Ex: Sessão Fotográfica"
                    value={apptTitle}
                    onChange={(e) => setApptTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E9D5FF] bg-white dark:border-neutral-800 dark:bg-[#0A080F] text-xs text-[#1E1B2E] dark:text-white outline-none focus:ring-1 focus:ring-purple-350"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[9px] font-bold text-[#5E537A] dark:text-neutral-400 block">Detalhes / Notas</label>
                  <input
                    type="text"
                    placeholder="Ex: Levar lentes zoom e flash."
                    value={apptObs}
                    onChange={(e) => setApptObs(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E9D5FF] bg-white dark:border-neutral-800 dark:bg-[#0A080F] text-xs text-[#1E1B2E] dark:text-white outline-none focus:ring-1 focus:ring-purple-350"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 mt-2 rounded-[14px] bg-[#7C3AED] hover:bg-[#6D28D9] dark:bg-white text-white dark:text-black font-extrabold text-xs transition cursor-pointer shadow"
                >
                  Confirmar Horário ✨
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
