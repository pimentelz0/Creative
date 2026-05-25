/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, Appointment, Note, PaymentStatus, ProjectProgress, UserProfile } from './types';

/**
 * SALVAR DADOS NO LOCALSTORAGE
 * Estas funções são responsáveis por persistir o estado da aplicação no navegador.
 */

export function saveClientsToStorage(clients: Client[]): void {
  try {
    localStorage.setItem('cliboard_clients', JSON.stringify(clients));
  } catch (error) {
    console.error('Erro ao salvar clientes:', error);
  }
}

export function saveAppointmentsToStorage(appointments: Appointment[]): void {
  try {
    localStorage.setItem('cliboard_appointments', JSON.stringify(appointments));
  } catch (error) {
    console.error('Erro ao salvar agendamentos:', error);
  }
}

export function saveQuickNoteToStorage(note: Note): void {
  try {
    localStorage.setItem('cliboard_quick_note', JSON.stringify(note));
  } catch (error) {
    console.error('Erro ao salvar nota rápida:', error);
  }
}

export function saveNotesToStorage(notes: Note[]): void {
  try {
    localStorage.setItem('cliboard_notes_list', JSON.stringify(notes));
  } catch (error) {
    console.error('Erro ao salvar lista de notas:', error);
  }
}

export function saveDarkModeToStorage(isEnabled: boolean): void {
  try {
    localStorage.setItem('cliboard_dark_mode', String(isEnabled));
  } catch (error) {
    console.error('Erro ao salvar tema:', error);
  }
}

/**
 * BUSCAR DADOS DO LOCALSTORAGE
 * Carrega as informações salvas ou retorna arrays vazios/padrões em caso de erro.
 */

export function getClientsFromStorage(defaultClients: Client[]): Client[] {
  try {
    const raw = localStorage.getItem('cliboard_clients');
    if (raw) {
      return JSON.parse(raw) as Client[];
    }
  } catch (error) {
    console.error('Erro ao ler clientes, usando valores padrão:', error);
  }
  return defaultClients;
}

export function getAppointmentsFromStorage(defaultAppointments: Appointment[]): Appointment[] {
  try {
    const raw = localStorage.getItem('cliboard_appointments');
    if (raw) {
      return JSON.parse(raw) as Appointment[];
    }
  } catch (error) {
    console.error('Erro ao ler agendamentos, usando valores padrão:', error);
  }
  return defaultAppointments;
}

export function getQuickNoteFromStorage(defaultNote: Note): Note {
  try {
    const raw = localStorage.getItem('cliboard_quick_note');
    if (raw) {
      return JSON.parse(raw) as Note;
    }
  } catch (error) {
    console.error('Erro ao ler nota rápida, usando valor padrão:', error);
  }
  return defaultNote;
}

export function getNotesFromStorage(defaultNotes: Note[]): Note[] {
  try {
    const raw = localStorage.getItem('cliboard_notes_list');
    if (raw) {
      return JSON.parse(raw) as Note[];
    }
    // Compatibilidade reversiva: se houver uma nota antiga, converte-a em lista
    const oldRaw = localStorage.getItem('cliboard_quick_note');
    if (oldRaw) {
      const parsed = JSON.parse(oldRaw) as Note;
      if (parsed && parsed.content) {
        parsed.id = parsed.id || 'quick_note';
        return [parsed];
      }
    }
  } catch (error) {
    console.error('Erro ao ler lista de notas, usando valor padrão:', error);
  }
  return defaultNotes;
}

export function getDarkModeFromStorage(): boolean {
  try {
    const raw = localStorage.getItem('cliboard_dark_mode');
    return raw === 'true';
  } catch {
    return false;
  }
}

/**
 * GERAÇÃO DE MENSAGENS DE COBRANÇA AUTOMÁTICA (WHATSAPP)
 * Cria um texto simpático, profissional e formatado para ser enviado à cliente.
 */
export function generateWhatsAppMessage(client: Client): string {
  const greeting = 'Olá, ' + client.name.split(' ')[0] + '! Tudo bem? ✨';
  const rest = 'Passando para atualizar o progresso do seu projeto de *' + client.service + '*.';
  
  let paymentText = '';
  const outstanding = client.totalValue - client.paidValue;
  
  if (client.paymentStatus === 'em_aberto') {
    paymentText = `Atualmente, o pagamento referente ao projeto (no valor de ${formatCurrency(client.totalValue)}) está em aberto. Qualquer dúvida sobre a chave Pix ou dados bancários, estou à disposição!`;
  } else if (client.paymentStatus === 'pago_parcial') {
    paymentText = `Vi aqui que fizemos o acerto parcial (resta um saldo de ${formatCurrency(outstanding)} do valor total de ${formatCurrency(client.totalValue)}). Me avisa quando ficar melhor realizar a segunda parte da transferência.`;
  } else if (client.paymentStatus === 'fixo_mensal') {
    paymentText = `Lembrando que nossa mensalidade fixa do projeto está ativa no valor de ${formatCurrency(client.totalValue)} para este período.`;
  } else {
    paymentText = 'Tudo certinho com a sua parte financeira! Agradeço imensamente a confiança no meu trabalho. 🎉';
  }

  const progressSteps: Record<ProjectProgress, string> = {
    roteiro: 'Roteiro e Planejamento inicial',
    gravado: 'Etapa de Gravação concluída 📸',
    editado: 'Fase de Edição e Pós-produção',
    entregue: 'Material Completo Entregue! 🚀'
  };

  const statusMsg = `\n\n📌 *Status do Projeto:* ${progressSteps[client.progress]}`;
  const end = `\n\nSe precisar ajustar algo na nossa entrega ou agendar nossa próxima sessão, é só me chamar. Um beijo!`;
  
  return encodeURIComponent(`${greeting}\n\n${rest}\n\n${paymentText}${statusMsg}${end}`);
}

/**
 * EXPORTAR CLIENTES COMO TEXTO SIMPLES
 * Formata toda a lista de clientes de maneira legível em texto para cópia rápida.
 */
export function exportClientsToText(clients: Client[]): string {
  if (clients.length === 0) return 'Nenhum cliente cadastrado ainda.';
  
  let text = '📋 RELATÓRIO DE CLIENTES - CREATIVE\n';
  text += '=====================================\n\n';
  
  clients.forEach((client, idx) => {
    const outstanding = client.totalValue - client.paidValue;
    const statusLabel = {
      pago: 'Pago (Verde) ✅',
      em_aberto: 'Em Aberto / Deve Tudo (Vermelho) ❌',
      pago_parcial: 'Pago Parcial (Amarelo) ⚠️',
      fixo_mensal: 'Fixo Mensal (Azul) 🔄'
    }[client.paymentStatus];

    const progressLabel = {
      roteiro: 'Roteiro 📝',
      gravado: 'Gravado 🎥',
      editado: 'Editado 💻',
      entregue: 'Entregue 🚀'
    }[client.progress];

    text += `${idx + 1}. ${client.name.toUpperCase()}\n`;
    text += `   📱 Contato/Whats: ${client.contact}\n`;
    text += `   💼 Serviço: ${client.service}\n`;
    text += `   💲 Financeiro: Total: ${formatCurrency(client.totalValue)} | Pago: ${formatCurrency(client.paidValue)} | Resta: ${formatCurrency(outstanding)}\n`;
    text += `   📊 Status de Pagamento: ${statusLabel}\n`;
    text += `   📈 Etapa do Projeto: ${progressLabel}\n`;
    if (client.observations) {
      text += `   📝 Observações: ${client.observations}\n`;
    }
    text += '-------------------------------------\n';
  });
  
  return text;
}

/**
 * COMPORTAMENTO DOS FILTROS E ABAS
 * Classifica a lista de clientes baseando-se na aba selecionada.
 */
export function filterClientsByTab(
  clients: Client[], 
  tab: string, 
  appointments: Appointment[]
): Client[] {
  switch (tab) {
    case 'semana': {
      // Clientes que possuem agendamento previsto nos próximos 7 dias (incluindo hoje)
      const today = new Date('2026-05-23'); // Usamos data do sistema como referência inicial
      const nextWeek = new Date('2026-05-30');
      
      const weeklyApptClientIds = appointments
        .filter(app => {
          const appDate = new Date(app.date);
          return appDate >= today && appDate <= nextWeek;
        })
        .map(app => app.clientId);
        
      return clients.filter(c => weeklyApptClientIds.includes(c.id));
    }
    case 'fixos':
      return clients.filter(c => c.paymentStatus === 'fixo_mensal');
    case 'pagos_tudo':
      return clients.filter(c => c.paymentStatus === 'pago');
    case 'pagos_parcial':
      return clients.filter(c => c.paymentStatus === 'pago_parcial');
    case 'em_aberto':
      return clients.filter(c => c.paymentStatus === 'em_aberto');
    default:
      return clients;
  }
}

/**
 * FORMATAR VALORES MONETÁRIOS
 * Retorna no padrão de moeda brasileira R$ 0.000,00
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * FORMATAR NÚMERO DE WHATSAPP PARA URL
 * Remove todos os caracteres não-numéricos do telefone
 */
export function formatWhatsAppLink(phone: string, text: string = ''): string {
  const cleaned = phone.replace(/\D/g, '');
  // Verifica se já tem o ddd completo ou código do país, senão concatena
  let finalNumber = cleaned;
  if (cleaned.length === 11 && !cleaned.startsWith('55')) {
    finalNumber = '55' + cleaned;
  } else if (cleaned.length === 9) {
    // Caso o usuário insira só o número sem DDD, pode dar erro, ideal educar na interface
    // Vamos apenas usar como o usuário preencheu ou assumir o padrão 5585 se for curto
    finalNumber = '5585' + cleaned;
  }
  
  let url = `https://wa.me/${finalNumber}`;
  if (text) {
    url += `?text=${text}`;
  }
  return url;
}

/**
 * SALVAR PERFIL DO USUÁRIO
 */
export function saveUserProfileToStorage(profile: UserProfile): void {
  try {
    localStorage.setItem('cliboard_user_profile', JSON.stringify(profile));
  } catch (error) {
    console.error('Erro ao salvar perfil do usuário:', error);
  }
}

/**
 * BUSCAR PERFIL DO USUÁRIO
 */
export function getUserProfileFromStorage(defaultProfile: UserProfile): UserProfile {
  try {
    const raw = localStorage.getItem('cliboard_user_profile');
    if (raw) {
      return JSON.parse(raw) as UserProfile;
    }
  } catch (error) {
    console.error('Erro ao ler perfil do usuário:', error);
  }
  return defaultProfile;
}

