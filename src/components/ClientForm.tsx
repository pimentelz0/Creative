/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Client, PaymentStatus, ProjectProgress } from '../types';

interface ClientFormProps {
  clientToEdit?: Client | null;
  onSubmit: (client: Omit<Client, 'id' | 'createdAt'> & { id?: string }) => void;
  onCancel: () => void;
}

export function ClientForm({ clientToEdit, onSubmit, onCancel }: ClientFormProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [service, setService] = useState('');
  const [totalValue, setTotalValue] = useState<number | ''>('');
  const [paidValue, setPaidValue] = useState<number | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('em_aberto');
  const [progress, setProgress] = useState<ProjectProgress>('roteiro');
  const [observations, setObservations] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientToEdit) {
      setName(clientToEdit.name);
      setContact(clientToEdit.contact);
      setService(clientToEdit.service);
      setTotalValue(clientToEdit.totalValue);
      setPaidValue(clientToEdit.paidValue);
      setPaymentStatus(clientToEdit.paymentStatus);
      setProgress(clientToEdit.progress);
      setObservations(clientToEdit.observations || '');
      setError(null);
    } else {
      setName('');
      setContact('');
      setService('');
      setTotalValue('');
      setPaidValue('');
      setPaymentStatus('em_aberto');
      setProgress('roteiro');
      setObservations('');
      setError(null);
    }
  }, [clientToEdit]);

  const handleTotalValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    setTotalValue(val);
  };

  const handlePaidValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? '' : Number(e.target.value);
    setPaidValue(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Por favor, informe o nome do cliente.');
      return;
    }
    if (!contact.trim()) {
      setError('O número de contato (WhatsApp) é obrigatório.');
      return;
    }
    if (!service.trim()) {
      setError('Descreva brevemente o serviço contratado.');
      return;
    }
    
    const finalTotal = typeof totalValue === 'number' ? totalValue : 0;
    const finalPaid = typeof paidValue === 'number' ? paidValue : 0;

    if (finalTotal < 0 || finalPaid < 0) {
      setError('Os valores financeiros precisam ser iguais ou maiores do que zero.');
      return;
    }

    if (finalPaid > finalTotal && paymentStatus !== 'fixo_mensal') {
      setError('O valor pago não pode ser maior do que o valor total do contrato (exceto contratos fixos ajustados).');
      return;
    }

    onSubmit({
      id: clientToEdit?.id,
      name: name.trim(),
      contact: contact.trim(),
      service: service.trim(),
      totalValue: finalTotal,
      paidValue: finalPaid,
      paymentStatus,
      progress,
      observations: observations.trim()
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-[28px] p-6 shadow-md" id="client-form-container">
      <div className="flex items-center gap-2.5 mb-5 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="font-extrabold text-white text-sm uppercase tracking-wider font-sans">
            {clientToEdit ? 'Editar Cadastro da Cliente' : 'Matricular Nova Cliente'}
          </h3>
          <p className="text-[10px] text-zinc-400 font-sans">
            Cadastre os dados, valores e a etapa atual do projeto.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/20 border border-rose-900 text-rose-400 text-[10px] font-bold flex items-center gap-2 animate-pulse font-sans" id="form-error-display">
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 font-sans">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
              Nome da Cliente *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Amanda Silva Fotografia"
              className="w-full px-3 py-2 bg-[#0A080F] text-[#F3E8FF] border border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-zinc-400 outline-none transition"
              id="field-client-name"
            />
          </div>

          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
              Contato (Insta/Whats com DDD) *
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Ex: 85999990050"
              className="w-full px-3 py-2 bg-[#0A080F] text-[#F3E8FF] border border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-zinc-400 outline-none transition"
              id="field-client-contact"
            />
          </div>
        </div>

        <div className="space-y-0.5">
          <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
            Serviço Contratado *
          </label>
          <input
            type="text"
            value={service}
            onChange={(e) => setService(e.target.value)}
            placeholder="Ex: Cobertura de Lançamento de Marca"
            className="w-full px-3 py-2 bg-[#0A080F] text-[#F3E8FF] border border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-zinc-400 outline-none transition"
            id="field-client-service"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
              Valor Total do Contrato (R$)
            </label>
            <input
              type="number"
              value={totalValue}
              onChange={handleTotalValueChange}
              placeholder="Ex: 1500"
              className="w-full px-3 py-2 bg-[#0A080F] text-[#F3E8FF] border border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-zinc-400 outline-none transition font-semibold font-sans animate-fade-in"
              id="field-client-total-value"
            />
          </div>

          <div className="space-y-0.5">
            <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
              Valor Pago (R$)
            </label>
            <input
              type="number"
              value={paidValue}
              onChange={handlePaidValueChange}
              placeholder="Ex: 500"
              className="w-full px-3 py-2 bg-[#0A080F] text-[#F3E8FF] border border-zinc-800 rounded-xl text-xs focus:ring-1 focus:ring-zinc-400 outline-none transition font-semibold font-sans animate-fade-in"
              id="field-client-paid-value"
            />
          </div>
        </div>

        {/* Status de Pagamento */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
            Status do Pagamento
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'pago', label: 'Pago', activeClass: 'active-pago' },
              { id: 'em_aberto', label: 'Em aberto', activeClass: 'active-em_aberto' },
              { id: 'pago_parcial', label: 'Parcial', activeClass: 'active-pago_parcial' },
              { id: 'fixo_mensal', label: 'Fixo mensal', activeClass: 'active-fixo_mensal' }
            ].map((option) => {
              const active = paymentStatus === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentStatus(option.id as PaymentStatus)}
                  className={`p-3 rounded-xl text-center text-xs font-black uppercase tracking-wider payment-option-btn ${active ? option.activeClass : ''}`}
                  id={`btn-payment-option-${option.id}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progresso do projeto */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
            Progresso do Projeto
          </label>
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black border border-zinc-850">
            {[
              { id: 'roteiro', label: 'Roteiro' },
              { id: 'gravado', label: 'Gravado' },
              { id: 'editado', label: 'Editado' },
              { id: 'entregue', label: 'Entregue' }
            ].map((step) => {
              const active = progress === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setProgress(step.id as ProjectProgress)}
                  className={`py-2 px-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-center transition cursor-pointer ${active ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                  id={`btn-progress-${step.id}`}
                >
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Observações */}
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
            Observações / Anotações
          </label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Ex: Briefing pendente ou indicações da cliente."
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-[#0A080F] text-[#F3E8FF] border border-zinc-800 text-xs outline-none transition resize-none focus:ring-1 focus:ring-zinc-400"
            id="field-client-observations"
          />
        </div>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white transition cursor-pointer uppercase tracking-wider"
            id="btn-cancel-form"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-black bg-white text-black hover:bg-zinc-200 transition cursor-pointer shadow uppercase tracking-wider"
            id="btn-submit-form"
          >
            {clientToEdit ? 'Salvar' : 'Confirmar'}
          </button>
        </div>
      </form>
    </div>
  );
}
