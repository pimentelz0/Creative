/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Client, Appointment } from '../types';
import { formatCurrency } from '../utils';

interface AnalyticsViewProps {
  clients: Client[];
  appointments: Appointment[];
}

export function AnalyticsView({ clients, appointments }: AnalyticsViewProps) {
  const [activeChart, setActiveChart] = useState<'finance' | 'services'>('finance');

  // Calculations
  const totalRaw = clients.reduce((acc, c) => acc + c.totalValue, 0);
  const totalPaid = clients.reduce((acc, c) => acc + c.paidValue, 0);
  const totalPending = clients.reduce((acc, c) => acc + Math.max(0, c.totalValue - c.paidValue), 0);
  
  // Service count
  const serviceStats = clients.reduce((acc, c) => {
    const sType = c.service.toLowerCase().includes('reels') || c.service.toLowerCase().includes('vídeo')
      ? 'Vídeo/Reels'
      : c.service.toLowerCase().includes('ensaio') || c.service.toLowerCase().includes('fotos')
      ? 'Fotos/Ensaio'
      : 'Gestão/Fixo';
    acc[sType] = (acc[sType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Dynamic 6-month revenue aggregator based on actual client creation times (zero placeholder/mock data!)
  const monthsNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const currentMonthIdx = new Date().getMonth();
  
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(currentMonthIdx - (5 - i));
    const mName = monthsNames[d.getMonth()];
    const mYear = d.getFullYear();
    const mIdx = d.getMonth();
    
    // Sum for clients created in this specific month and year
    const monthClients = clients.filter(c => {
      const cDate = new Date(c.createdAt || Date.now());
      return cDate.getMonth() === mIdx && cDate.getFullYear() === mYear;
    });
    
    const value = monthClients.reduce((sum, c) => sum + c.totalValue, 0);
    const paid = monthClients.reduce((sum, c) => sum + c.paidValue, 0);
    
    return { name: mName, value, paid };
  });

  const maxVal = Math.max(...monthlyData.map(d => d.value)) || 1000;

  return (
    <div className="space-y-6 animate-fade-in" id="analytics-section-view">
      {/* View Header */}
      <div>
        <h2 className="text-sm font-black text-[#1E1B2E] dark:text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
          Insights &amp; Crescimento
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up text-zinc-400"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
        </h2>
        <p className="text-[10px] text-[#5E537A] dark:text-neutral-400 mt-0.5 font-sans">
          Métricas de posicionamento de mercado e faturamento operacional.
        </p>
      </div>

      {/* Financial Health Summary Slider */}
      <div className="grid grid-cols-3 gap-2" id="analytics-summary-cards">
        <div className="p-3 rounded-2xl bg-white border border-[#E9D5FF] dark:border-zinc-300 shadow-sm">
          <span className="text-[8px] font-black text-black block uppercase tracking-wider font-sans">PROJETADO</span>
          <p className="text-[11px] sm:text-xs font-black text-black mt-1 font-sans">
            {formatCurrency(totalRaw)}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-emerald-200 dark:border-zinc-300 shadow-sm">
          <span className="text-[8px] font-black text-black block uppercase tracking-wider font-sans">CONCLUÍDO</span>
          <p className="text-[11px] sm:text-xs font-black text-black mt-1 font-sans">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-rose-200 dark:border-zinc-300 shadow-sm">
          <span className="text-[8px] font-black text-black block uppercase tracking-wider font-sans">PENDENTE</span>
          <p className="text-[11px] sm:text-xs font-black text-black mt-1 font-sans">
            {formatCurrency(totalPending)}
          </p>
        </div>
      </div>

      {/* Interactive Beautiful SVG Chart Card */}
      <div className="p-5 rounded-[28px] bg-white border border-zinc-250 dark:border-zinc-300 shadow-md">
        <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-3.5 mb-4">
          <div>
            <h3 className="font-extrabold text-zinc-950 text-xs tracking-tight font-sans">
              Performance do Semestre
            </h3>
            <p className="text-[9px] text-zinc-600 font-sans">
              Evolução das finanças brutas vs líquidas.
            </p>
          </div>

          <div className="flex gap-1.5 p-0.5 bg-zinc-100 dark:bg-zinc-100 rounded-lg border border-zinc-200">
            <button
              onClick={() => setActiveChart('finance')}
              className={`px-2 py-1 text-[8px] font-black rounded-md cursor-pointer transition ${activeChart === 'finance' ? 'bg-black text-white shadow' : 'text-zinc-600'}`}
            >
              Faturamento
            </button>
            <button
              onClick={() => setActiveChart('services')}
              className={`px-2 py-1 text-[8px] font-black rounded-md cursor-pointer transition ${activeChart === 'services' ? 'bg-black text-white shadow' : 'text-zinc-600'}`}
            >
              Projetos
            </button>
          </div>
        </div>

        {activeChart === 'finance' ? (
          <div>
            {/* Custom Responsive SVG Chart Area */}
            <div className="h-44 w-full relative">
              <svg viewBox="0 0 400 160" className="w-full h-full overflow-visible">
                {/* Background Grid Lines */}
                <line x1="40" y1="20" x2="380" y2="20" stroke="#CCCCCC" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="60" x2="380" y2="60" stroke="#CCCCCC" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="100" x2="380" y2="100" stroke="#CCCCCC" strokeOpacity="0.4" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="40" y1="140" x2="380" y2="140" stroke="#CCCCCC" strokeOpacity="0.7" strokeWidth="1" />

                {/* Draw Areas & Paths */}
                {(() => {
                  const padding = 40;
                  const width = 340;
                  const itemWidth = width / (monthlyData.length - 1);
                  
                  // Coordinate builder
                  const pointsRaw = monthlyData.map((d, i) => {
                    const x = padding + i * itemWidth;
                    const y = 140 - (d.value / maxVal) * 110;
                    return { x, y };
                  });

                  const pointsPaid = monthlyData.map((d, i) => {
                    const x = padding + i * itemWidth;
                    const y = 140 - (d.paid / maxVal) * 110;
                    return { x, y };
                  });

                  // Build path strings
                  const dRawStr = pointsRaw.reduce((acc, p, i) => acc + `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
                  const dRawArea = dRawStr + ` L ${pointsRaw[pointsRaw.length - 1].x} 140 L ${pointsRaw[0].x} 140 Z`;

                  const dPaidStr = pointsPaid.reduce((acc, p, i) => acc + `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
                  const dPaidArea = dPaidStr + ` L ${pointsPaid[pointsPaid.length - 1].x} 140 L ${pointsPaid[0].x} 140 Z`;

                  return (
                    <>
                      {/* Raw area */}
                      <path d={dRawArea} fill="url(#gradRaw)" opacity="0.15" />
                      <path d={dRawStr} fill="none" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Paid area (Purple turned black) */}
                      <path d={dPaidArea} fill="url(#gradPaid)" opacity="0.1" />
                      <path d={dPaidStr} fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Sparkles or indicators at joints */}
                      {pointsRaw.map((p, i) => (
                        <g key={`marker-raw-${i}`}>
                          <circle cx={p.x} cy={p.y} r="3.5" fill="#FFFFFF" stroke="#F472B6" strokeWidth="2" />
                          <circle cx={pointsPaid[i].x} cy={pointsPaid[i].y} r="3.5" fill="#FFFFFF" stroke="#000000" strokeWidth="2" />
                        </g>
                      ))}

                      {/* Gradients */}
                      <defs>
                        <linearGradient id="gradRaw" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F472B6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#F472B6" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#000000" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </>
                  );
                })()}

                {/* X labels */}
                {monthlyData.map((d, i) => {
                  const x = 40 + i * (340 / (monthlyData.length - 1));
                  return (
                    <text key={`lbl-x-${i}`} x={x} y="155" textAnchor="middle" fill="#5F5E6B" className="text-[8px] font-mono font-bold">
                      {d.name}
                    </text>
                  );
                })}
              </svg>
            </div>
            
            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-rose-500">
                <span className="w-2 h-2 rounded-full bg-[#F472B6]" /> Faturamento Acumulado (Bruto)
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-900">
                <span className="w-2 h-2 rounded-full bg-black" /> Dinheiro Realizado (Recebido)
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Custom visual distribution of services as clean progress comparison blocks */}
            <div className="space-y-3.5 py-4 font-sans text-xs">
              {Object.entries(serviceStats).map(([service, count]) => {
                const pct = clients.length ? (count / clients.length) * 100 : 0;
                return (
                  <div key={service} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold font-sans">
                      <span className="text-zinc-950 uppercase tracking-wide">{service}</span>
                      <span className="text-black">{count} projeto(s) ({Math.round(pct)}%)</span>
                    </div>
                    {/* Visual Bar */}
                    <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-zinc-700 to-black rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {clients.length > 0 ? (
              (() => {
                let topCategory = 'Projetos';
                let topCount = 0;
                Object.entries(serviceStats).forEach(([cat, val]) => {
                  if (val > topCount) {
                    topCount = val;
                    topCategory = cat;
                  }
                });
                return (
                  <p className="text-[9px] text-zinc-650 italic text-center leading-relaxed">
                    *A categoria "{topCategory}" é o seu maior volume de vendas atual, com {topCount} projeto(s).
                  </p>
                );
              })()
            ) : (
              <p className="text-[9px] text-zinc-650 italic text-center leading-relaxed font-sans">
                *Distribuição de tipos de projetos e serviços com base no seu cadastro de clientes.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Target goals and Conversion advice */}
      <div className="p-5 rounded-[28px] bg-white border border-zinc-200 shadow-lg">
        <h3 className="font-extrabold text-rose-700 text-xs flex items-center gap-1.5 font-sans">
          <span className="text-rose-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-target"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </span>
          Meta Financeira Mensal
        </h3>
        <p className="text-[10px] sm:text-xs text-emerald-850 font-bold font-sans mt-1">
          Você faturou R$ {totalPaid.toFixed(2)} da sua meta de R$ 15.000,00 ({Math.round((totalPaid / 15000) * 100)}% concluída).
        </p>
        
        {/* Fill bar representing percentage to goal */}
        <div className="w-full h-3 rounded-full bg-zinc-100 p-0.5 border border-zinc-200 mt-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-600 to-teal-700 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (totalPaid / 15000) * 100)}%` }}
          />
        </div>

        <p className="text-[10px] text-zinc-800 leading-relaxed font-sans mt-3.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles inline-block mr-1 text-amber-500"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/></svg>
          <strong>Iniciativa:</strong> Faltam apenas {clients.filter(c => c.paymentStatus === 'em_aberto').length} acertos de cobrança de contratos para atingir o faturamento bruto ideal para esse mês! Use os botões de cobrança de WhatsApp na prancheta de clientes.
        </p>
      </div>
    </div>
  );
}
