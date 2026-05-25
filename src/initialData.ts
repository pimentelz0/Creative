/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, Appointment, Note } from './types';

// Let's keep them completely blank/empty as requested so statistics and clients start from personal user records
export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_NOTE: Note = {
  id: 'quick_note',
  content: `📝 Suas ideias e rascunhos rápidos!
Toque aqui para digitar roteiros de vídeos, rascunhos de posts ou lembretes do dia-a-dia.`,
  updatedAt: new Date().toISOString()
};
