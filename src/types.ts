/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PaymentStatus = 'pago' | 'em_aberto' | 'pago_parcial' | 'fixo_mensal';

export type ProjectProgress = 'roteiro' | 'gravado' | 'editado' | 'entregue';

export type AppointmentStatus = 'ocupado' | 'pendente' | 'livre';

export interface Client {
  id: string;
  name: string;
  contact: string; // WhatsApp info
  service: string;
  totalValue: number;
  paidValue: number;
  paymentStatus: PaymentStatus;
  progress: ProjectProgress;
  observations: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  clientId: string; // empty string or "none" if quick appointment
  customTitle: string; // fallback or simple description
  date: string; // YYYY-MM-DD
  status: AppointmentStatus;
  time?: string;
  observations?: string;
}

export interface Note {
  id?: string;
  content: string;
  updatedAt: string;
}

export interface UserProfile {
  name: string;
  avatarUrl: string; // If empty, we use emoji + gradient background
  avatarEmoji: string;
  avatarColor: string; // Gradient color name e.g. 'from-pink-500 to-rose-500'
}
