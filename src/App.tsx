/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Appointment, Note, PaymentStatus, ProjectProgress, UserProfile } from './types';
import { 
  INITIAL_CLIENTS, 
  INITIAL_APPOINTMENTS, 
  INITIAL_NOTE 
} from './initialData';
import { 
  getClientsFromStorage, 
  getAppointmentsFromStorage, 
  getQuickNoteFromStorage, 
  getNotesFromStorage,
  saveClientsToStorage,
  saveAppointmentsToStorage,
  saveDarkModeToStorage,
  saveUserProfileToStorage,
  getUserProfileFromStorage,
  saveQuickNoteToStorage,
  saveNotesToStorage
} from './utils';
import { NotificationsAlerts } from './components/NotificationsAlerts';
import { DashboardStats } from './components/DashboardStats';
import { ClientForm } from './components/ClientForm';
import { ClientList } from './components/ClientList';
import { VisualCalendar } from './components/VisualCalendar';
import { QuickNotes } from './components/QuickNotes';
import { AnalyticsView } from './components/AnalyticsView';
import { AuthScreen } from './components/AuthScreen';
import { 
  supabase,
  testSupabaseConnection,
  fetchClientsFromSupabase,
  saveClientToSupabase,
  deleteClientFromSupabase,
  fetchAppointmentsFromSupabase,
  saveAppointmentToSupabase,
  deleteAppointmentFromSupabase,
  fetchNoteFromSupabase,
  fetchNotesFromSupabase,
  deleteNoteFromSupabase,
  fetchUserProfileFromSupabase,
  saveUserProfileToSupabase,
  saveNoteToSupabase,
  SUPABASE_SETUP_SQL
} from './supabaseClient';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const DEFAULT_PROFILE: UserProfile = {
  name: 'Criativo',
  avatarUrl: '',
  avatarEmoji: '🎥',
  avatarColor: 'from-zinc-800 to-black'
};

export default function App() {
  // --- STATE ---
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [quickNote, setQuickNote] = useState<Note>({ id: 'quick_note', content: '', updatedAt: '' });
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  
  // --- USER PROFILE STATE ---
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState<boolean>(false);
  const [showNotesModal, setShowNotesModal] = useState<boolean>(false);
  
  // --- PASSWORD UPDATE STATE ---
  const [showPasswordSection, setShowPasswordSection] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  
  // --- SUPABASE SYNC STATE ---
  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(true);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [showSqlSetupModal, setShowSqlSetupModal] = useState<boolean>(false);

  // --- NAVIGATION HISTORY STACK ---
  const [sectionHistory, setSectionHistory] = useState<('dashboard' | 'clients' | 'calendar' | 'analytics')[]>([]);
  
  const [currentSection, setCurrentSection] = useState<'dashboard' | 'clients' | 'calendar' | 'analytics'>('dashboard');
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const navigateToSection = (newSection: 'dashboard' | 'clients' | 'calendar' | 'analytics') => {
    if (currentSection !== newSection) {
      setSectionHistory(prev => {
        const nextHist = [...prev, currentSection];
        // Keep a max of 15 items in history
        if (nextHist.length > 15) {
          return nextHist.slice(nextHist.length - 15);
        }
        return nextHist;
      });
      setCurrentSection(newSection);
    }
  };

  const handleBack = () => {
    if (isClientFormOpen || clientToEdit) {
      setIsClientFormOpen(false);
      setClientToEdit(null);
      return;
    }
    if (sectionHistory.length > 0) {
      const prev = sectionHistory[sectionHistory.length - 1];
      setSectionHistory(prevHistory => prevHistory.slice(0, -1));
      setCurrentSection(prev);
    } else {
      setCurrentSection('dashboard');
    }
  };
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [activeClientsTab, setActiveClientsTab] = useState('todos');

  // Active Project Detail Modal (for mockup high fidelity mockup cards)
  const [selectedMockProject, setSelectedMockProject] = useState<{
    title: string;
    category: string;
    progress: number;
    image: string;
    clientContact: string;
    details: string;
    serviceType: string;
  } | null>(null);

  // --- AUTH SESSION STATE ---
  const [showAgentDrawer, setShowAgentDrawer] = useState<boolean>(false);
  const [agentMessages, setAgentMessages] = useState<{ sender: 'user' | 'agent'; text: string; time: string }[]>([
    { sender: 'agent', text: 'Estou um passo à frente. O que deseja que eu reorganize?', time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [agentInput, setAgentInput] = useState<string>('');
  const [isAgentTyping, setIsAgentTyping] = useState<boolean>(false);

  const [sessionUser, setSessionUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [bypassOffline, setBypassOffline] = useState<boolean>(() => {
    return localStorage.getItem('creative_bypass_offline') === 'true';
  });

  // --- INITIAL SPLASH SCREEN & ONBOARDING STATES ---
  const [playingSplash, setPlayingSplash] = useState<boolean>(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<'terms' | 'tut1' | 'tut2' | 'tut3' | 'tut4'>('terms');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);

  // 1. Splash screen play timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setPlayingSplash(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  // 2. Onboarding check when user or session changes
  useEffect(() => {
    if (sessionUser || bypassOffline) {
      const userId = sessionUser?.id || 'offline';
      const key = `creative_onboarded_v2_${userId}`;
      const alreadyOnboarded = localStorage.getItem(key) === 'true';
      if (!alreadyOnboarded) {
        setShowOnboarding(true);
        setOnboardingStep('terms');
      } else {
        setShowOnboarding(false);
      }
    } else {
      setShowOnboarding(false);
    }
  }, [sessionUser, bypassOffline]);

  // --- PERSISTENCE & AUTH SYNC EFFECTS ---
  
  // 1. Listen for Supabase Authentication State changes
  useEffect(() => {
    // Force light beautiful clean theme as requested by user
    document.documentElement.classList.remove('dark');
    saveDarkModeToStorage(false);

    // Initial check for active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessionUser(session?.user ?? null);
        setAuthLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Synchronize internal application states when user login changes
  useEffect(() => {
    // Immediately pull from localStorage to keep UI super responsive (optimistic load)
    const loadedClients = getClientsFromStorage(INITIAL_CLIENTS);
    const loadedAppointments = getAppointmentsFromStorage(INITIAL_APPOINTMENTS);
    const loadedNote = getQuickNoteFromStorage(INITIAL_NOTE);
    const loadedNotes = getNotesFromStorage([INITIAL_NOTE]);
    let loadedProfile = getUserProfileFromStorage(DEFAULT_PROFILE);

    // If loaded profile is using the old template default 'Karol Gonçalo', clean it up to say 'Criativo'
    if (loadedProfile && loadedProfile.name === 'Karol Gonçalo') {
      loadedProfile = {
        ...loadedProfile,
        name: 'Criativo'
      };
      saveUserProfileToStorage(loadedProfile);
    }

    setClients(loadedClients);
    setAppointments(loadedAppointments);
    setQuickNote(loadedNote);
    setNotes(loadedNotes);
    setProfile(loadedProfile);

    if (!sessionUser) {
      setSupabaseLoading(false);
      return;
    }

    setSupabaseLoading(true);

    const initSupabase = async () => {
      try {
        const isOnline = await testSupabaseConnection();
        setSupabaseConnected(isOnline);
        
        if (isOnline) {
          const cloudClients = await fetchClientsFromSupabase();
          const cloudAppts = await fetchAppointmentsFromSupabase();
          const cloudNote = await fetchNoteFromSupabase();
          const cloudNotes = await fetchNotesFromSupabase();
          const cloudProfile = await fetchUserProfileFromSupabase();

          if (cloudClients !== null) {
            setClients(cloudClients);
            saveClientsToStorage(cloudClients);
          }
          if (cloudAppts !== null) {
            setAppointments(cloudAppts);
            saveAppointmentsToStorage(cloudAppts);
          }
          if (cloudNote !== null) {
            setQuickNote(cloudNote);
            saveQuickNoteToStorage(cloudNote);
          } else {
            const emptyNote = { id: 'quick_note', content: '', updatedAt: '' };
            setQuickNote(emptyNote);
            saveQuickNoteToStorage(emptyNote);
          }
          if (cloudNotes !== null) {
            setNotes(cloudNotes);
            saveNotesToStorage(cloudNotes);
          }

          // Dynamic Profile Sync & Legacy Fallback Self-Repair Mechanics for Google/Social log-in
          let resolvedProfile = cloudProfile;
          const oauthName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name;
          const oauthPicture = sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture || '';

          if (resolvedProfile === null) {
            // New user signed up, build an initial profile based on their Google OAuth details
            let initialName = '';
            if (oauthName) {
              initialName = oauthName;
            } else if (sessionUser.email) {
              const emailPrefix = sessionUser.email.split('@')[0];
              initialName = emailPrefix
                .split(/[._\-+]/)
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            } else {
              initialName = 'Criativo';
            }

            resolvedProfile = {
              name: initialName,
              avatarUrl: oauthPicture,
              avatarEmoji: '🎥',
              avatarColor: 'from-zinc-800 to-black'
            };

            setProfile(resolvedProfile);
            saveUserProfileToStorage(resolvedProfile);
            await saveUserProfileToSupabase(resolvedProfile);
          } else if (resolvedProfile.name === 'Karol Gonçalo' && oauthName) {
            // Self-repair: they had a profile, but with the default hardcoded template name 'Karol Gonçalo'
            // Migrate them automatically to their Google name to prevent confusion!
            const updatedProfile = {
              ...resolvedProfile,
              name: oauthName,
              avatarUrl: resolvedProfile.avatarUrl || oauthPicture
            };
            setProfile(updatedProfile);
            saveUserProfileToStorage(updatedProfile);
            await saveUserProfileToSupabase(updatedProfile);
          } else {
            // Standard loaded profile from the cloud
            setProfile(resolvedProfile);
            saveUserProfileToStorage(resolvedProfile);
          }
        }
      } catch (err) {
        console.error('Falha ao sincronizar com Supabase:', err);
      } finally {
        setSupabaseLoading(false);
      }
    };

    initSupabase();
  }, [sessionUser]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('creative_bypass_offline');
      localStorage.removeItem('cliboard_clients');
      localStorage.removeItem('cliboard_appointments');
      localStorage.removeItem('cliboard_quick_note');
      localStorage.removeItem('cliboard_notes_list');
      localStorage.removeItem('cliboard_user_profile');
      setBypassOffline(false);
      setSessionUser(null);
      showToast('Sessão encerrada com sucesso! Volte sempre! 👋', 'success');
    } catch (e) {
      showToast('Erro ao encerrar sessão.', 'error');
    }
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSaveClient = async (clientData: Omit<Client, 'id' | 'createdAt'> & { id?: string }) => {
    try {
      let updatedClients: Client[];
      let targetClient: Client;

      if (clientData.id) {
        const existing = clients.find(c => c.id === clientData.id);
        targetClient = {
          ...existing!,
          name: clientData.name,
          contact: clientData.contact,
          service: clientData.service,
          totalValue: clientData.totalValue,
          paidValue: clientData.paidValue,
          paymentStatus: clientData.paymentStatus,
          progress: clientData.progress,
          observations: clientData.observations
        };
        updatedClients = clients.map(c => c.id === clientData.id ? targetClient : c);
        showToast(`Cadastro de "${clientData.name}" atualizado! ✨`);
      } else {
        targetClient = {
          id: 'c_' + Date.now(),
          name: clientData.name,
          contact: clientData.contact,
          service: clientData.service,
          totalValue: clientData.totalValue,
          paidValue: clientData.paidValue,
          paymentStatus: clientData.paymentStatus,
          progress: clientData.progress,
          observations: clientData.observations,
          createdAt: new Date().toISOString()
        };
        updatedClients = [targetClient, ...clients];
        showToast(`"${clientData.name}" adicionada com absoluto sucesso! 🚀`);
      }

      setClients(updatedClients);
      saveClientsToStorage(updatedClients);
      setIsClientFormOpen(false);
      setClientToEdit(null);

      // Sincroniza de forma assíncrona com Supabase
      if (supabaseConnected) {
        await saveClientToSupabase(targetClient);
      }
    } catch (err) {
      showToast('Ocorreu um problema ao salvar.', 'error');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      const target = clients.find(c => c.id === clientId);
      const updated = clients.filter(c => c.id !== clientId);
      setClients(updated);
      saveClientsToStorage(updated);
      showToast(`O cadastro de "${target ? target.name : 'Cliente'}" foi removido.`, 'info');

      if (supabaseConnected) {
        await deleteClientFromSupabase(clientId);
      }
    } catch (err) {
      showToast('Erro ao remover cliente.', 'error');
    }
  };

  const handleUpdateProgress = async (clientId: string, newProgress: ProjectProgress) => {
    try {
      const updated = clients.map(c => {
        if (c.id === clientId) {
          const updatedClient = { ...c, progress: newProgress };
          if (supabaseConnected) {
            saveClientToSupabase(updatedClient);
          }
          return updatedClient;
        }
        return c;
      });
      setClients(updated);
      saveClientsToStorage(updated);
      
      const progressLabel = {
        roteiro: 'Roteiro 📝',
        gravado: 'Gravado 🎥',
        editado: 'Editado 💻',
        entregue: 'Entregue 🚀'
      }[newProgress];

      showToast(`Etapa atualizada para: ${progressLabel}`);
    } catch (err) {
      showToast('Erro ao atualizar progresso.', 'error');
    }
  };

  const handleAgentAction = async (action: { type: string; payload?: any }) => {
    if (!action) return;
    try {
      if (action.type === 'create_client') {
        const { name, service, totalValue, paidValue, progress, contact } = action.payload;
        
        let paymentStatus: PaymentStatus = 'em_aberto';
        if (paidValue >= totalValue && totalValue > 0) {
          paymentStatus = 'pago';
        } else if (paidValue > 0 && paidValue < totalValue) {
          paymentStatus = 'pago_parcial';
        }

        const newClient: Client = {
          id: 'c_' + Date.now(),
          name: name || 'Novo Cliente',
          contact: contact || '(85) 99999-9999',
          service: service || 'Produção Audiovisual',
          totalValue: totalValue || 1500,
          paidValue: paidValue || 0,
          paymentStatus: paymentStatus,
          progress: progress || 'roteiro',
          observations: 'Criado de forma automatizada via comando do Agente C.',
          createdAt: new Date().toISOString()
        };

        const updated = [newClient, ...clients];
        setClients(updated);
        saveClientsToStorage(updated);
        
        if (supabaseConnected) {
          await saveClientToSupabase(newClient);
        }
        showToast(`"${newClient.name}" cadastrada com extremo sucesso sob instrução de C! 🚀`);
      } 
      else if (action.type === 'update_client_progress') {
        const { clientId, progress } = action.payload;
        if (!clientId) return;

        const updated = clients.map(c => {
          if (c.id === clientId) {
            const updatedClient = { ...c, progress: progress as ProjectProgress };
            if (supabaseConnected) {
              saveClientToSupabase(updatedClient);
            }
            return updatedClient;
          }
          return c;
        });

        setClients(updated);
        saveClientsToStorage(updated);
        showToast(`Fase do projeto atualizada para ${progress} via Agente C! 🎥`);
      }
      else if (action.type === 'delete_client') {
        const { clientId } = action.payload;
        if (!clientId) return;

        const target = clients.find(c => c.id === clientId);
        const updated = clients.filter(c => c.id !== clientId);
        setClients(updated);
        saveClientsToStorage(updated);
        
        if (supabaseConnected) {
          await deleteClientFromSupabase(clientId);
        }
        showToast(`"${target ? target.name : 'Projeto'}" removido do Creative via Agente C.`, 'info');
      }
    } catch (err) {
      console.error("Erro ao aplicar ação do agente:", err);
    }
  };

  const handleSendAgentMessage = async (textToSend?: string) => {
    const messageText = textToSend || agentInput;
    if (!messageText.trim()) return;

    const userMsg = { 
      sender: 'user' as const, 
      text: messageText, 
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
    };
    
    setAgentMessages(prev => [...prev, userMsg]);
    setAgentInput('');
    setIsAgentTyping(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          clients: clients,
          appointments: appointments,
          profile: profile
        })
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await response.json();
      
      const agentMsg = {
        sender: 'agent' as const,
        text: data.message || 'Diretriz processada e resolvida.',
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      
      setAgentMessages(prev => [...prev, agentMsg]);

      if (data.action) {
        await handleAgentAction(data.action);
      }
    } catch (error) {
      console.warn('Agent C API offline, checking for VITE_GEMINI_API_KEY for direct client-side Gemini call:', error);
      
      const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
      if (viteKey && viteKey !== 'MY_GEMINI_API_KEY' && viteKey !== '') {
        try {
          const sysInstruction = `
Você é "C", o agente de inteligência artificial confidencial e assistente operacional do sistema "Creative".
Você é misterioso, estiloso, preciso, elegante, sofisticado, confiante e eficiente.
Seu tom de voz é seco, elegante, sofisticado e confiante. Você fala com extremo profissionalismo, poucas palavras e frases impactantes. Nada de brincadeiras intelectuais baratas ou enrolação fútil.
Você já sabe o que precisa ser feito ou o que o usuário quer antes de ele detalhar exaustivamente.

Nesta sessão, você tem duas missões principais:
1. Conversar com o usuário (tirar dúvidas, formular insights de fluxo do caixa comercial, resumir e orientar decisões).
2. Agir no Creative automaticamente (criar projeto/cliente, redefinir fase, excluir contratos).

Você deve retornar obrigatoriamente um objeto em JSON puro com a seguinte estrutura:
{
  "message": "Mensagem curta, enigmática, seca e refinada contendo sua resposta em português do Brasil.",
  "action": {
    "type": "create_client" | "update_client_progress" | "delete_client",
    "payload": { ... }
  }
}

Se o usuário focar apenas em perguntas, conversação, análises gerais ou feedback sem alteração cadastral iminente, omita ou configure "action": null.

Aqui estão os dados analíticos do usuário no app Creative para sua referência lógica de IDs, nomes e status:
- Projetos/Clientes Ativos atualmente: ${JSON.stringify(clients || [])}
- Compromissos e Agenda: ${JSON.stringify(appointments || [])}
- Dados de Perfil: ${JSON.stringify(profile || {})}

Orientação das ações operacionais diretas no Creative:
1. Cadastrar contrato/cliente novo:
   - type: "create_client"
   - payload: { name: string, service: string, totalValue: number, paidValue: number, progress: "roteiro" | "gravado" | "editado" | "entregue", contact: string }

2. Atualizar etapa/fase do contrato:
   - type: "update_client_progress"
   - payload: { clientId: string, progress: "roteiro" | "gravado" | "editado" | "entregue" }
   - IMPORTANTE: Descubra o clientId cruzando o nome do cliente que o usuário escreveu com a lista de Clientes Atuais fornecida.

3. Excluir contrato:
   - type: "delete_client"
   - payload: { clientId: string }

Se o usuário solicitar comandos bizarros ou alheios ao Creative, diga polidamente: "Isso está além da minha operação."
Seja direto. Retorne exclusivamente o JSON sem Markdown fences de bloco de código (\`\`\`json).
`;

          const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${viteKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: messageText }] }],
              systemInstruction: { parts: [{ text: sysInstruction }] },
              generationConfig: {
                responseMimeType: "application/json"
              }
            })
          });

          if (!apiResponse.ok) {
            throw new Error(`Gemini client API returned HTTP ${apiResponse.status}`);
          }

          const apiData = await apiResponse.json();
          const responseText = apiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);

          const agentMsg = {
            sender: 'agent' as const,
            text: parsed.message || 'Diretriz processada e resolvida.',
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          };
          
          setAgentMessages(prev => [...prev, agentMsg]);

          if (parsed.action) {
            await handleAgentAction(parsed.action);
          }
          return; // Skip local fallback as direct Gemini call succeeded!
        } catch (clientGeminiErr) {
          console.error("Direct browser Gemini call failed:", clientGeminiErr);
        }
      }

      // Built-in failover cognitive engine runs completely client-side (Vercel compatible!)
      const cleanMsg = messageText.toLowerCase().trim();
      let responseText = "Isso está além da minha operação.";
      let actionObj: any = null;

      if (cleanMsg.includes("cria") || cleanMsg.includes("cadastra") || cleanMsg.includes("novo projeto") || cleanMsg.includes("registrar")) {
        // e.g. "c, cria um projeto pra Ana, 2500 reais, tá no roteiro"
        const valueMatch = cleanMsg.match(/(\d+[\d.,]*)/);
        const value = valueMatch ? parseFloat(valueMatch[1].replace(/[^\d]/g, "")) : 2500;
        
        let clientName = "Ana";
        if (cleanMsg.includes("para a ") || cleanMsg.includes("pra a ") || cleanMsg.includes("para ") || cleanMsg.includes("pra ")) {
          const parts = messageText.split(/(?:para a|pra a|para|pra)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
          if (parts[1]) {
            clientName = parts[1].split(/[\s,.]/)[0];
            clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1);
          }
        }
        
        responseText = `Feito. Cliente: ${clientName} | Valor: R$ ${value.toLocaleString("pt-BR")} | Status: Roteiro 📝`;
        actionObj = {
          type: "create_client",
          payload: {
            name: clientName,
            service: "Produção Audiovisual",
            totalValue: value,
            paidValue: 0,
            progress: "roteiro",
            contact: "(85) 99999-9999"
          }
        };
      } else if (cleanMsg.includes("entregu") || cleanMsg.includes("concluid") || cleanMsg.includes("finaliza")) {
        let clientFound = null;
        if (clients && Array.isArray(clients)) {
          clientFound = clients.find((c: any) => cleanMsg.includes(c.name.toLowerCase()));
        }

        if (clientFound) {
          responseText = `Projeto de "${clientFound.name}" encerrado. Status: Entregue 🚀 Ele saiu dos projetos ativos.`;
          actionObj = {
            type: "update_client_progress",
            payload: {
              clientId: clientFound.id,
              progress: "entregue"
            }
          };
        } else {
          // If not matched, try to find a generic name after "de " or "da "
          let inferredName = "";
          if (cleanMsg.includes("projeto de ")) {
             const parts = messageText.split(/projeto de\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
             if (parts[1]) inferredName = parts[1].split(/[\s,.]/)[0];
          } else if (cleanMsg.includes("projeto da ")) {
             const parts = messageText.split(/projeto da\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
             if (parts[1]) inferredName = parts[1].split(/[\s,.]/)[0];
          } else if (cleanMsg.includes("projeto do ")) {
             const parts = messageText.split(/projeto do\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
             if (parts[1]) inferredName = parts[1].split(/[\s,.]/)[0];
          } else if (cleanMsg.includes("da ")) {
             const parts = messageText.split(/da\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
             if (parts[1]) inferredName = parts[1].split(/[\s,.]/)[0];
          } else if (cleanMsg.includes("de ")) {
             const parts = messageText.split(/de\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
             if (parts[1]) inferredName = parts[1].split(/[\s,.]/)[0];
          } else {
             // split words
             const words = messageText.split(/\s+/);
             for (const w of words) {
               const cleanW = w.replace(/[^\w]/g, "");
               if (cleanW.length > 2) {
                 const match = clients.find(c => c.name.toLowerCase().includes(cleanW.toLowerCase()));
                 if (match) {
                   clientFound = match;
                   break;
                }
               }
             }
          }

          if (clientFound) {
            responseText = `Projeto de "${clientFound.name}" encerrado. Status: Entregue 🚀 Ele saiu dos projetos ativos.`;
            actionObj = {
              type: "update_client_progress",
              payload: {
                clientId: clientFound.id,
                progress: "entregue"
              }
            };
          } else {
            const secondaryFound = inferredName ? clients.find((c: any) => c.name.toLowerCase().includes(inferredName.toLowerCase())) : null;
            if (secondaryFound) {
              responseText = `Projeto de "${secondaryFound.name}" encerrado. Status: Entregue 🚀 Ele saiu dos projetos ativos.`;
              actionObj = {
                type: "update_client_progress",
                payload: {
                  clientId: secondaryFound.id,
                  progress: "entregue"
                }
              };
            } else {
              responseText = "Isso está além da minha operação. Não identifiquei o projeto ativo solicitado.";
            }
          }
        }
      } else if (cleanMsg.includes("quanto tenho") || cleanMsg.includes("receber") || cleanMsg.includes("financeiro") || cleanMsg.includes("saldo")) {
        const pendingValue = clients?.reduce((acc: number, c: any) => {
          if (c.progress !== 'entregue') {
            return acc + Math.max(0, c.totalValue - c.paidValue);
          }
          return acc;
        }, 0) || 0;
        responseText = `Analisando... Você tem R$ ${pendingValue.toLocaleString("pt-BR")} pendentes em projetos ativos atualmente.`;
      } else if (cleanMsg.includes("olá") || cleanMsg.includes("oi") || cleanMsg.includes("quem é") || cleanMsg.includes("qual seu nome")) {
        responseText = "Sou C. Seu agente de inteligência focado e preciso. Já sei o que precisa ser feito. Diga-me seu comando operacional.";
      }

      const failoverMsg = {
        sender: 'agent' as const,
        text: responseText,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setAgentMessages(prev => [...prev, failoverMsg]);

      if (actionObj) {
        await handleAgentAction(actionObj);
      }
    } finally {
      setIsAgentTyping(false);
    }
  };

  const handleAddAppointment = async (apptData: Omit<Appointment, 'id'> & { id?: string }) => {
    try {
      const newAppt: Appointment = {
        id: 'a_' + Date.now(),
        clientId: apptData.clientId,
        customTitle: apptData.customTitle,
        date: apptData.date,
        status: apptData.status,
        time: apptData.time,
        observations: apptData.observations
      };

      const updated = [newAppt, ...appointments];
      setAppointments(updated);
      saveAppointmentsToStorage(updated);
      showToast('Compromisso agendado no calendário com sucesso! 📅');

      if (supabaseConnected) {
        await saveAppointmentToSupabase(newAppt);
      }
    } catch (err) {
      showToast('Erro ao salvar agendamento.', 'error');
    }
  };

  const handleDeleteAppointment = async (apptId: string) => {
    try {
      const updated = appointments.filter(a => a.id !== apptId);
      setAppointments(updated);
      saveAppointmentsToStorage(updated);
      showToast('Reserva excluída com sucesso.', 'info');

      if (supabaseConnected) {
        await deleteAppointmentFromSupabase(apptId);
      }
    } catch (err) {
      showToast('Erro ao excluir agendamento.', 'error');
    }
  };


  const handleAlertSelectClient = (clientId: string) => {
    setCurrentSection('clients');
    setActiveClientsTab('todos');
    const targetEl = document.getElementById(`client-card-${clientId}`);
    if (targetEl) {
      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
    showToast('Visualizando dependência da cliente indicada.', 'info');
  };

  // Switch filter category click on mockup actions
  const handleCategoryFilter = (category: 'photo' | 'video' | 'social') => {
    setCurrentSection('clients');
    if (category === 'video') {
      setActiveClientsTab('todos');
      showToast('Filtro de Vídeos / Reels aplicado! Filtre os clientes abaixo. 🎥', 'info');
    } else if (category === 'photo') {
      setActiveClientsTab('todos');
      showToast('Filtro de Ensaios Fotográficos aplicado! Filtre os clientes abaixo. 📷', 'info');
    } else {
      setActiveClientsTab('fixos');
      showToast('Filtrando Clientes de Gestão de Mídia / Redes. 🔗', 'info');
    }
  };

  if (playingSplash) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0A0A0C] text-white flex flex-col items-center justify-center font-sans overflow-hidden">
        {/* Ambient atmospheric backdrop light glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#A78BFA]/15 rounded-full blur-[100px] pointer-events-none animate-pulse" />
        
        <div className="relative text-center space-y-4 max-w-xs px-6 animate-fade-in">
          <motion.h1 
            initial={{ letterSpacing: "0.2em", opacity: 0 }}
            animate={{ letterSpacing: "0.35em", opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
            className="text-4xl font-serif font-black uppercase text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
          >
            CREATIVE
          </motion.h1>
          
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: 48 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="h-[2px] bg-white/40 mx-auto rounded-full mt-2" 
          />
          
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="text-[9px] uppercase font-sans font-black tracking-[0.25em] text-[#A78BFA]/90"
          >
            Produtividade Premium
          </motion.p>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="text-[7px] text-zinc-500 font-sans tracking-widest uppercase"
          >
            Criatividade Automatizada
          </motion.p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070708] text-white flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A78BFA] mb-4"></div>
        <p className="text-[10px] uppercase tracking-[0.2em] font-sans font-black text-zinc-500">Iniciando Creative Studio...</p>
      </div>
    );
  }

  if (!sessionUser && !bypassOffline) {
    return (
      <div className="min-h-screen bg-[#070708] text-white flex justify-center py-0 sm:py-8 relative overflow-x-hidden" id="premium-creator-auth-workspace">
        {/* TOAST SYSTEM (MINIMALIST MATTE BLACK GLASS NOTIFICATION) */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 animate-fade-in" id="global-system-toast">
            <div className="px-5 py-3 rounded-xl bg-zinc-900/90 text-white border border-zinc-800 shadow-2xl text-xs font-bold flex items-center gap-3 backdrop-blur-md">
              <span className="text-[#A78BFA] text-xs">●</span>
              <p>{toastMessage.text}</p>
            </div>
          </div>
        )}
        <AuthScreen
          onAuthSuccess={(session) => {
            setSessionUser(session.user);
          }}
          onBypassOffline={() => {
            localStorage.setItem('creative_bypass_offline', 'true');
            setBypassOffline(true);
            showToast('Modo Offline ativado! Seus dados ficam salvos no navegador.', 'info');
          }}
          showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen h-[100dvh] sm:h-auto bg-[#070708] text-white flex justify-center py-0 sm:py-8 relative overflow-hidden sm:overflow-x-hidden" id="premium-creator-desktop-workspace">
      
      {/* ATMOSPHERIC LUXURY SHADOW PROJECTIONS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] bg-white/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[250px] h-[250px] bg-zinc-800/10 rounded-full blur-[120px] pointer-events-none" />

      {/* TOAST SYSTEM (MINIMALIST MATTE BLACK GLASS NOTIFICATION) */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in" id="global-system-toast">
          <div className="px-5 py-3 rounded-xl bg-zinc-900/90 text-white border border-zinc-800 shadow-2xl text-xs font-bold flex items-center gap-3 backdrop-blur-md">
            <span className="text-[#A78BFA] text-xs">●</span>
            <p>{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Main Container - styled like the luxury matte-black iPhone bezel mockups */}
      <div 
        className="w-full max-w-[430px] h-[100dvh] sm:h-[880px] max-h-[100dvh] sm:max-h-[880px] bg-[#0A0A0C] border-0 sm:border-[12px] border-zinc-900 rounded-none sm:rounded-[48px] overflow-hidden relative shadow-2xl flex flex-col justify-between pb-16 animate-fade-in" 
        id="app-viewport-inner"
        style={{ contentVisibility: 'auto' }}
      >
        {/* VIEWPORT CONTENT AREA (SCROLLABLE WITH HIDDEN SCROLLBAR) */}
        <div className="flex-1 overflow-y-auto scrollbar-none">
          
          {/* MOCKUP CAMERA & TIME HEADER BACKGROUND */}
          <div className="bg-gradient-to-b from-[#16161A] to-[#0A0A0C] text-white pt-6 pb-8 px-6 rounded-none sm:rounded-t-[36px] relative border-b border-white/[0.04]">
             
            {/* Real Mockup Header Actions */}
            <div className="flex items-center justify-between mt-1">
              {/* Left circular glass button - Menu or Back Arrow depending on context */}
              {currentSection !== 'dashboard' || isClientFormOpen || clientToEdit ? (
                <button 
                  onClick={handleBack}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] text-white transition cursor-pointer animate-fade-in"
                  title="Voltar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left"><line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                </button>
              ) : (
                <button 
                  onClick={() => setShowMenuDrawer(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] text-white transition cursor-pointer animate-fade-in"
                  title="Menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                </button>
              )}
 
              {/* Logo brand using imported Oswald title headings to match Page 1 */}
              <div className="text-center select-none">
                <h1 className="text-2xl font-serif font-bold tracking-[0.2em] uppercase text-white flex items-center justify-center gap-1.5 hover:scale-[1.02] transition-transform">
                  CREATIVE
                </h1>
              </div>
 
              {/* Right circular notification button */}
              <button 
                onClick={() => {
                  showToast('Tudo sob controle! Nenhum prazo vencendo agora.', 'info');
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] text-white transition cursor-pointer relative"
                title="Notificações"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              </button>
            </div>
          </div>
 
          {/* MAIN BLACK CARD CONTAINER (Slipping up under the beautiful header curve) */}
          <div className="bg-[#0A0A0C] -mt-2 rounded-t-[28px] pt-4 pb-6 px-5 relative z-10 space-y-6">
            
            {/* VIEW 1: DASHBOARD (Home Layout matching the attached mockup perfectly) */}
            {currentSection === 'dashboard' && (
              <div className="space-y-6 animate-fade-in" id="mobile-home-viewport">
                
                {/* 1. BRAND WELCOME GREETING WITH PROFILE & NEW PROJECT CAP ACTIONS */}
                <div className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-800/80 p-4 rounded-3xl shadow-lg" id="mockup-profile-greet">
                  <div 
                    onClick={() => setShowProfileModal(true)}
                    className="flex items-center gap-3 cursor-pointer hover:opacity-95 transition-all group flex-1"
                    title="Editar Perfil"
                  >
                    {/* Avatar structure */}
                    <div className="relative shrink-0">
                      <div className="w-[50px] h-[50px] rounded-full overflow-hidden border border-zinc-700 text-white flex items-center justify-center shadow-inner relative">
                        {profile.avatarUrl ? (
                          <img 
                            src={profile.avatarUrl} 
                            alt={profile.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-tr ${profile.avatarColor || 'from-zinc-805 to-black'} flex items-center justify-center text-lg`}>
                            {profile.avatarEmoji || '🎥'}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-bold transition-opacity">
                          EDITAR
                        </div>
                      </div>
                    </div>
 
                    {/* Greeting Messages */}
                    <div className="space-y-0.5">
                      <h3 className="font-extrabold text-white text-xs tracking-wide font-sans flex items-center gap-1 uppercase">
                        {profile.name}
                      </h3>
                      <p className="text-[9px] text-zinc-500 leading-snug font-medium font-sans uppercase tracking-wider">
                        <span className="text-white underline hover:text-zinc-200 transition-colors">Ajustar Perfil</span>
                      </p>
                    </div>
                  </div>
                </div>
 
                 {/* 2. UNIFIED STREAMLINED FLOW - NO FRICTION CATEGORY STEP */}
                <div className="grid grid-cols-3 gap-2" id="mockup-unified-actions">
                  <button
                    onClick={() => {
                      setClientToEdit(null);
                      setCurrentSection('clients');
                      setIsClientFormOpen(true);
                      showToast('Iniciando registro de trabalho...', 'info');
                    }}
                    className="p-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-2xl flex flex-col items-start gap-2.5 transition duration-200 cursor-pointer text-left select-none outline-none group"
                    type="button"
                  >
                    <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-zinc-200 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-white block">Registrar</span>
                      <span className="text-[7px] text-zinc-500 block mt-0.5 font-sans leading-none">Novo contrato</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setCurrentSection('calendar')}
                    className="p-3 bg-zinc-900 hover:bg-[#15151a] border border-zinc-800 rounded-2xl flex flex-col items-start gap-2.5 transition duration-200 cursor-pointer text-left select-none outline-none group"
                    type="button"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-850 border border-zinc-800 text-white flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-white block">Agenda</span>
                      <span className="text-[7px] text-zinc-500 block mt-0.5 font-sans leading-none">Compromissos</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowNotesModal(true)}
                    className="p-3 bg-zinc-900 hover:bg-[#15151a] border border-zinc-800 rounded-2xl flex flex-col items-start gap-2.5 transition duration-200 cursor-pointer text-left select-none outline-none group"
                    type="button"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-850 border border-zinc-800 text-white flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-white block">Bloco Notas</span>
                      <span className="text-[7px] text-zinc-500 block mt-0.5 font-sans leading-none">Editar salvas</span>
                    </div>
                  </button>
                </div>

                {/* 3. DYNAMIC MEUS PROJETOS SECTION */}
                <div className="space-y-4 font-sans" id="projects-section-deck">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-100">
                      Projetos Recentes
                    </h2>
                    <button 
                      onClick={() => setCurrentSection('clients')}
                      className="text-[10px] font-bold text-white hover:underline cursor-pointer bg-transparent border-none"
                    >
                      Ver todos &gt;
                    </button>
                  </div>

                  <div className="flex flex-col gap-3">
                    {clients.filter(c => c.progress !== 'entregue').length === 0 ? (
                      <div className="p-5 text-center bg-zinc-900/40 border border-zinc-800/60 rounded-2xl shadow-sm text-neutral-400 font-sans">
                        <span className="text-xl">🎬</span>
                        <p className="font-bold text-xs text-white mt-2">Nenhum projeto ativo cadastrado</p>
                        <p className="text-[10px] mt-0.5 text-zinc-400">
                          Toque em <strong className="text-white">"Criar"</strong> acima para registrar seu primeiro projeto!
                        </p>
                      </div>
                    ) : (
                      clients.filter(c => c.progress !== 'entregue').slice(0, 3).map(client => {
                        const progressPct = client.progress === 'entregue' ? 100 : client.progress === 'editado' ? 75 : client.progress === 'gravado' ? 50 : 25;
                        const progressLabel = client.progress === 'entregue' ? 'Entregue 🚀' : client.progress === 'editado' ? 'Editado 💻' : client.progress === 'gravado' ? 'Gravado 🎥' : 'Roteiro 📝';
                        const isVideo = client.service.toLowerCase().includes('reels') || client.service.toLowerCase().includes('vídeo') || client.service.toLowerCase().includes('video');
                        const isPhoto = client.service.toLowerCase().includes('ensaio') || client.service.toLowerCase().includes('fotos') || client.service.toLowerCase().includes('foto');
                        
                        const imageThumb = isVideo 
                          ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop'
                          : isPhoto 
                          ? 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=100&auto=format&fit=crop'
                          : 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=100&auto=format&fit=crop';
                          
                        const categoryLabel = isVideo ? 'Vídeo/Reels' : isPhoto ? 'Foto/Ensaio' : 'Gestão/Fixo';
                        const dotColor = client.progress === 'entregue' ? 'bg-emerald-400' : client.progress === 'editado' ? 'bg-[#9B6EFF]' : client.progress === 'gravado' ? 'bg-zinc-400' : 'bg-status-amber bg-amber-400';

                        return (
                          <div 
                            key={client.id}
                            onClick={() => setSelectedMockProject({
                              title: client.name,
                              category: categoryLabel,
                              progress: progressPct,
                              image: imageThumb.replace('w=100', 'w=400'),
                              clientContact: client.contact,
                              details: client.observations || 'Nenhuma observação informada até o momento para este contrato.',
                              serviceType: client.service
                            })}
                            className="p-3 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex items-center justify-between gap-3 shadow-md hover:scale-[1.01] hover:border-zinc-700 transition cursor-pointer group animate-fade-in"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="min-w-0 leading-tight">
                                <h4 className="text-xs font-bold text-white truncate group-hover:text-zinc-300 transition">
                                  {client.name}
                                </h4>
                                <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-zinc-400 mt-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} /> {client.service}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0 w-24">
                              <span className="text-[9px] font-bold text-zinc-300">{progressLabel}</span>
                              <div className="w-full h-1 rounded-full bg-zinc-800 overflow-hidden">
                                <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 4. REAL DYNAMIC STATISTICS GRID (NO HARDCODED NUMBERS) */}
                <div className="space-y-4 font-sans" id="stats-section-deck">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-100">
                      Resumo Financeiro
                    </h2>
                    <button 
                      onClick={() => setCurrentSection('analytics')}
                      className="text-[10px] font-bold text-white hover:underline cursor-pointer bg-transparent border-none"
                    >
                      Módulos &gt;
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3" id="stats-mockup-grid">
                    
                    {/* Card 1: Projetos Ativos */}
                    <div className="p-3 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col justify-between space-y-3 shadow-md hover:scale-[1.02] transition leading-tight">
                      <div className="flex items-center gap-2">
                        <div className="w-[32px] h-[32px] rounded-lg bg-zinc-800 text-zinc-350 flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-briefcase"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                            Projetos Ativos
                          </p>
                          <h4 className="text-sm font-black text-white font-sans mt-0.5">
                            {clients.filter(c => c.progress !== 'entregue').length}
                          </h4>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md self-start">
                        Ativos
                      </span>
                    </div>

                    {/* Card 2: Total Recebido */}
                    <div className="p-3 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col justify-between space-y-3 shadow-md hover:scale-[1.02] transition leading-tight">
                      <div className="flex items-center gap-2">
                        <div className="w-[32px] h-[32px] rounded-lg bg-zinc-800 text-zinc-350 flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-dollar-sign"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                            Entrada Caixa
                          </p>
                          <h4 className="text-xs font-black text-white font-sans mt-0.5 truncate">
                            {formatCurrency(clients.reduce((acc, c) => acc + c.paidValue, 0))}
                          </h4>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded-md self-start border border-emerald-500/10">
                        Confirmado
                      </span>
                    </div>

                    {/* Card 3: Valores em Aberto */}
                    <div className="p-3 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col justify-between space-y-3 shadow-md hover:scale-[1.02] transition leading-tight">
                      <div className="flex items-center gap-2">
                        <div className="w-[32px] h-[32px] rounded-lg bg-zinc-800 text-zinc-350 flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-hourglass"><path d="M5 2h14"/><path d="M5 22h14"/><path d="M19 2v4c0 3.3-3 6-7 6s-7-2.7-7-6V2"/><path d="M12 12c-4 0-7 2.7-7 6v4h14v-4c0-3.3-3-6-7-6z"/></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                            Saldo em Aberto
                          </p>
                          <h4 className="text-xs font-black text-white font-sans mt-0.5 truncate">
                            {formatCurrency(clients.reduce((acc, c) => acc + Math.max(0, c.totalValue - c.paidValue), 0))}
                          </h4>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded-md self-start border border-amber-500/10">
                        Previsão
                      </span>
                    </div>

                    {/* Card 4: Taxa de Conclusão */}
                    <div className="p-3 bg-zinc-900 border border-zinc-800/80 rounded-2xl flex flex-col justify-between space-y-3 shadow-md hover:scale-[1.02] transition leading-tight">
                      <div className="flex items-center gap-2">
                        <div className="w-[32px] h-[32px] rounded-lg bg-zinc-800 text-zinc-350 flex items-center justify-center shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clapperboard"><path d="M20.2 6 3 11l-.9-2.4 17.2-5.1Z"/><path d="M4 11h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/><path d="M12 11v11"/><path d="M3 17h18"/></svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block truncate">
                            Taxa de Entrega
                          </p>
                          <h4 className="text-sm font-black text-white font-sans mt-0.5">
                            {clients.length > 0 
                              ? `${Math.round((clients.filter(c => c.progress === 'entregue').length / clients.length) * 100)}%`
                              : '0%'}
                          </h4>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-md self-start border border-blue-500/10">
                        Meta
                      </span>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* VIEW 2: CLIENT CARDS / PROJECTS LIST */}
            {currentSection === 'clients' && (
              <div className="space-y-5 animate-fade-in" id="mobile-clients-viewport">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider font-sans">
                    Clientes &amp; Contratos
                  </h2>
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-sans">
                    Gerencie faturas de ensaios, links do WhatsApp e prazos de entregas.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setClientToEdit(null);
                    setIsClientFormOpen(!isClientFormOpen);
                  }}
                  className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 hover:border-zinc-700 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 font-sans cursor-pointer shadow-sm uppercase tracking-wider"
                  type="button"
                >
                  <span>{isClientFormOpen ? '✕ Fechar Prancheta' : '➕ Novo Contrato / Cadastro'}</span>
                </button>

                {(isClientFormOpen || clientToEdit) && (
                  <div className="pt-1 animate-fade-in">
                    <ClientForm 
                      clientToEdit={clientToEdit}
                      onSubmit={handleSaveClient}
                      onCancel={() => {
                        setIsClientFormOpen(false);
                        setClientToEdit(null);
                      }}
                    />
                  </div>
                )}

                <ClientList 
                  clients={clients}
                  appointments={appointments}
                  activeTab={activeClientsTab}
                  onActiveTabChange={setActiveClientsTab}
                  onEditClient={(client) => {
                    setClientToEdit(client);
                    setIsClientFormOpen(true);
                    showToast(`Editando dados de "${client.name}"`, 'info');
                  }}
                  onDeleteClient={handleDeleteClient}
                  onUpdateProgress={handleUpdateProgress}
                />
              </div>
            )}

            {/* VIEW 3: SYSTEM CALENDAR */}
            {currentSection === 'calendar' && (
              <div className="space-y-5 animate-fade-in" id="mobile-calendar-viewport">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider font-sans">
                    Calendário de Produção
                  </h2>
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-sans">
                    Toque em dias livres para travar bloqueios de ensaios fotográficos.
                  </p>
                </div>

                <VisualCalendar 
                  clients={clients}
                  appointments={appointments}
                  onAddAppointment={handleAddAppointment}
                  onDeleteAppointment={handleDeleteAppointment}
                />
              </div>
            )}

            {/* VIEW 4: SYSTEM ANALYTICS VIEW */}
            {currentSection === 'analytics' && (
              <div className="pt-1 animate-fade-in">
                <AnalyticsView 
                  clients={clients}
                  appointments={appointments}
                />
              </div>
            )}

          </div>
        </div>

        {/* POPUP: DETAILED HIGH-FIDELITY PROJECT INFO DRAWER FROM MOCKUP HOME ACTION */}
        {selectedMockProject && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
            onClick={() => setSelectedMockProject(null)}
          >
            <div 
              className="relative w-full max-w-sm bg-[#121215] rounded-[32px] p-6 border border-zinc-800 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full h-36 rounded-2xl overflow-hidden relative border border-zinc-800">
                <img 
                  src={selectedMockProject.image} 
                  alt="Current preview theme" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedMockProject(null)}
                  className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center bg-black/80 hover:bg-black text-white text-xs rounded-full border-none cursor-pointer"
                >
                  ✕
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-3 text-white">
                  <span className="text-[8px] bg-zinc-800 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                    {selectedMockProject.category}
                  </span>
                  <h4 className="text-sm font-black text-white font-sans mt-1">
                    {selectedMockProject.title}
                  </h4>
                </div>
              </div>

              <div className="space-y-2.5 text-xs font-sans">
                <div>
                  <span className="text-[8px] font-extrabold text-zinc-400 block uppercase tracking-wider">TIPO DE SERVIÇO</span>
                  <p className="text-white font-bold mt-0.5">
                    {selectedMockProject.serviceType}
                  </p>
                </div>

                <div>
                  <span className="text-[8px] font-extrabold text-zinc-400 block uppercase tracking-wider">DESCRIÇÃO E RECURSOS</span>
                  <p className="text-zinc-300 font-medium leading-relaxed mt-0.5">
                    {selectedMockProject.details}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                  <div className="leading-tight">
                    <span className="text-[8px] font-bold text-zinc-400 block uppercase tracking-wider">PROGRESSO</span>
                    <span className="text-sm font-black text-white">{selectedMockProject.progress}%</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMockProject(null);
                      setCurrentSection('clients');
                    }}
                    className="px-4 py-2 bg-white hover:bg-zinc-100 text-black font-extrabold text-[10px] rounded-full border-none cursor-pointer shadow-md uppercase tracking-widest transition-transform hover:scale-105 active:scale-95"
                  >
                    Ver Contrato
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* POPUP: ONBOARDING (TERMS & TUTORIAL) */}
        {showOnboarding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in font-sans">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="relative w-full max-w-sm bg-[#121215] rounded-[32px] p-6 border border-zinc-800 shadow-2xl space-y-5 max-h-[92vh] flex flex-col justify-between overflow-y-auto"
            >
              {/* Header Branding */}
              <div className="flex items-center gap-3 border-b border-zinc-850 pb-4 select-none">
                <span className="w-10 h-10 rounded-2xl bg-white text-black flex items-center justify-center font-bold text-lg shadow-md">🎬</span>
                <div className="text-left">
                  <h3 className="text-lg font-serif font-bold tracking-[0.1em] text-white">CREATIVE</h3>
                  <p className="text-[8px] tracking-wider text-[#A78BFA] font-sans font-black uppercase">Onboarding de Boas-Vindas</p>
                </div>
              </div>

              {onboardingStep === 'terms' && (
                <div className="flex-1 flex flex-col justify-between space-y-4 text-left">
                  <div className="space-y-2">
                    <span className="text-2xl block">📜</span>
                    <h4 className="text-sm font-black text-white font-sans uppercase tracking-wider">Contrato de Adesão & Termos de Uso</h4>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      Seja bem-vindo ao Creative Studio, a central de produtividade definitiva de criadores de conteúdo! Para garantir a segurança dos seus dados e clientes, solicitamos sua concordância com os princípios do estúdio:
                    </p>
                    <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-850 space-y-2.5 text-[9px] text-zinc-400 font-sans max-h-44 overflow-y-auto leading-relaxed divide-y divide-zinc-900">
                      <p className="pb-1.5 font-medium"><strong className="text-white">1. Propriedade dos Dados:</strong> Seus registros de contratos, faturamentos, custos e anotações confidenciais pertencem única e exclusivamente a você.</p>
                      <p className="py-1.5 font-medium"><strong className="text-white">2. Organização e Sigilo:</strong> Você concorda em fazer uso ético das informações arquivadas de seus clientes e parceiros de negócios.</p>
                      <p className="pt-1.5 font-medium"><strong className="text-white">3. Sincronização Segura:</strong> Seus dados são salvos localmente no navegador e sincronizados automaticamente na nuvem do Supabase quando houver conexão.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-start gap-3 p-3 bg-zinc-950/60 rounded-2xl border border-zinc-850 hover:bg-zinc-900/40 transition cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 rounded border-zinc-800 text-[#A78BFA] focus:ring-[#A78BFA] bg-zinc-900 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[10px] text-zinc-300 font-semibold leading-relaxed">
                        Eu li, compreendo e aceito voluntariamente todos os Termos de Uso e Políticas supramencionadas.
                      </span>
                    </label>

                    <button
                      onClick={() => setOnboardingStep('tut1')}
                      disabled={!acceptedTerms}
                      className={`w-full py-3 font-extrabold text-xs rounded-2xl cursor-pointer shadow-md uppercase tracking-widest transition active:scale-95 text-center flex items-center justify-center gap-2 ${acceptedTerms ? 'bg-white text-black hover:bg-zinc-100' : 'bg-zinc-850 text-zinc-550 border-none opacity-40 cursor-not-allowed'}`}
                    >
                      Avançar para Tutorial ⚡
                    </button>
                  </div>
                </div>
              )}

              {onboardingStep === 'tut1' && (
                <div className="flex-1 flex flex-col justify-between space-y-4 text-left">
                  <div className="space-y-3">
                    <div className="w-full h-32 rounded-2xl bg-zinc-950 border border-zinc-850 flex items-center justify-center text-5xl">
                      📁
                    </div>
                    <span className="text-[8px] bg-[#A78BFA]/15 text-[#A78BFA] font-black px-2.5 py-1 rounded-full uppercase tracking-wider block w-max">Módulo 1 de 4</span>
                    <h4 className="text-sm font-black text-white font-sans uppercase tracking-wider">Gestão de Contratos de Clientes</h4>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      Organize suas diárias, orçamentos e prazos em um painel unificado. Controle com precisão o <span className="text-emerald-400 font-semibold">valor total do contrato</span>, a <span className="text-amber-400 font-semibold">quantia já recebida</span> e a etapa atual de produção com um clique.
                    </p>
                  </div>

                  <button
                    onClick={() => setOnboardingStep('tut2')}
                    className="w-full py-3 bg-white hover:bg-zinc-100 text-black font-extrabold text-xs rounded-2xl cursor-pointer shadow-md uppercase tracking-widest transition active:scale-95 text-center flex items-center justify-center gap-1.5"
                  >
                    Próximo Passo ➜
                  </button>
                </div>
              )}

              {onboardingStep === 'tut2' && (
                <div className="flex-1 flex flex-col justify-between space-y-4 text-left">
                  <div className="space-y-3">
                    <div className="w-full h-32 rounded-2xl bg-zinc-950 border border-zinc-850 flex items-center justify-center text-5xl">
                      📅
                    </div>
                    <span className="text-[8px] bg-[#A78BFA]/15 text-[#A78BFA] font-black px-2.5 py-1 rounded-full uppercase tracking-wider block w-max">Módulo 2 de 4</span>
                    <h4 className="text-sm font-black text-white font-sans uppercase tracking-wider">Agenda e Gravações</h4>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      Nunca mais perca um agendamento ou sofra com sobreposição de datas. O calendário interativo exibe todas as pendências e diárias marcadas de forma cronológica por cores exclusivas de status.
                    </p>
                  </div>

                  <button
                    onClick={() => setOnboardingStep('tut3')}
                    className="w-full py-3 bg-white hover:bg-zinc-100 text-black font-extrabold text-xs rounded-2xl cursor-pointer shadow-md uppercase tracking-widest transition active:scale-95 text-center flex items-center justify-center gap-1.5"
                  >
                    Próximo Passo ➜
                  </button>
                </div>
              )}

              {onboardingStep === 'tut3' && (
                <div className="flex-1 flex flex-col justify-between space-y-4 text-left">
                  <div className="space-y-3">
                    <div className="w-full h-32 rounded-2xl bg-zinc-950 border border-zinc-850 flex items-center justify-center text-5xl">
                      📈
                    </div>
                    <span className="text-[8px] bg-[#A78BFA]/15 text-[#A78BFA] font-black px-2.5 py-1 rounded-full uppercase tracking-wider block w-max">Módulo 3 de 4</span>
                    <h4 className="text-sm font-black text-white font-sans uppercase tracking-wider">Métricas de Faturamento</h4>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                      Acompanhe o crescimento financeiro do seu estúdio. Gráficos em tempo real calculam o faturamento mensal total, ticket médio contratado, saldo pendente a receber e margens operacionais de forma automática.
                    </p>
                  </div>

                  <button
                    onClick={() => setOnboardingStep('tut4')}
                    className="w-full py-3 bg-white hover:bg-zinc-100 text-black font-extrabold text-xs rounded-2xl cursor-pointer shadow-md uppercase tracking-widest transition active:scale-95 text-center flex items-center justify-center gap-1.5"
                  >
                    Próximo Passo ➜
                  </button>
                </div>
              )}

              {onboardingStep === 'tut4' && (
                <div className="flex-1 flex flex-col justify-between space-y-4 text-left">
                  <div className="space-y-3">
                    <div className="w-full h-32 rounded-2xl bg-zinc-950 border border-zinc-850 flex items-center justify-center text-5xl">
                      📝
                    </div>
                    <span className="text-[8px] bg-[#A78BFA]/15 text-[#A78BFA] font-black px-2.5 py-1 rounded-full uppercase tracking-wider block w-max">Módulo 4 de 4</span>
                    <h4 className="text-sm font-black text-white font-sans uppercase tracking-wider">Bloco de Rascunho Integrado</h4>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-sans font-sans">
                      O bloco de rascunhos em tempo real é ideal para registrar roteiros de Reels, pré-sets artísticos, ideias de transições de vídeo e insights que surgem durante os ensaios no estúdio.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const userId = sessionUser?.id || 'offline';
                      const key = `creative_onboarded_v2_${userId}`;
                      localStorage.setItem(key, 'true');
                      setShowOnboarding(false);
                      showToast('Bem-vindo à nova era do seu estúdio! Boas gravações! 🎬✨', 'success');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-[#A78BFA] to-purple-600 text-white font-extrabold text-xs rounded-2xl cursor-pointer shadow-lg uppercase tracking-widest transition active:scale-95 hover:brightness-110 text-center flex items-center justify-center gap-1.5"
                  >
                    Iniciar no Creative ✨
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* POPUP: EDITABLE USER PROFILE MODAL */}
        {showProfileModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
            onClick={() => setShowProfileModal(false)}
          >
            <div 
              className="relative w-full max-w-sm bg-[#121215] rounded-[32px] p-6 border border-zinc-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👩‍🎨</span>
                  <div>
                    <h4 className="text-sm font-black text-white font-sans uppercase tracking-wider">
                      Seu Perfil Profissional
                    </h4>
                    <p className="text-[9px] text-zinc-400 font-sans">
                      Ajuste seu nome e foto artística
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-full border-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs font-sans">
                {/* Visual Preview */}
                <div className="flex flex-col items-center justify-center py-4 bg-zinc-950 rounded-2xl border border-zinc-800/80">
                  <div className="relative bg-[#121215] p-1 rounded-full">
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-zinc-700 relative flex items-center justify-center text-white font-bold shadow-sm">
                      {profile.avatarUrl ? (
                        <img 
                          src={profile.avatarUrl} 
                          alt={profile.name} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-tr ${profile.avatarColor} flex items-center justify-center text-3xl font-sans`}>
                          {profile.avatarEmoji}
                        </div>
                      )}
                    </div>
                    <span className="absolute -bottom-1 -left-1 bg-black border border-zinc-700 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm select-none">
                      🎥
                    </span>
                  </div>
                  <h3 className="font-extrabold text-white text-sm mt-2">
                    {profile.name}
                  </h3>
                </div>

                {/* Input Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                    Nome / Marca Cinematográfica
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => {
                      const updated = { ...profile, name: e.target.value };
                      setProfile(updated);
                    }}
                    placeholder="Digite seu nome..."
                    className="w-full p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:border-zinc-500 outline-none"
                  />
                </div>

                {/* Input Profile Picture via File Upload */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                    Foto de Perfil
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      id="profile-file-uploader"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            showToast('Selecione uma imagem menor que 2MB.', 'error');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64String = reader.result as string;
                            setProfile((prev) => ({ ...prev, avatarUrl: base64String }));
                            showToast('Foto carregada! Clique em Salvar Alterações para confirmar.', 'info');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('profile-file-uploader')?.click()}
                      className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      {profile.avatarUrl ? 'Alterar Foto' : 'Carregar Foto'}
                    </button>
                    {profile.avatarUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfile((prev) => ({ ...prev, avatarUrl: '' }));
                          showToast('Foto de perfil removida!', 'info');
                        }}
                        className="px-3 py-2 bg-red-950/30 hover:bg-red-900/30 border border-red-900/30 text-red-400 rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                  <p className="text-[8px] text-zinc-500">
                    Importe uma foto. Se deixar sem foto de perfil, a logo predefinida abaixo será usada.
                  </p>
                </div>

                {!profile.avatarUrl && (
                  <>
                    {/* Emoji Select Grid */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                        Escolha o Ícone Predefinido
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {['🎥', '👩‍🎨', '📷', '🎬', '🎨', '🚀', '⭐', '✨', '👑', '💼'].map((emo) => (
                          <button
                            key={emo}
                            type="button"
                            onClick={() => {
                              const updated = { ...profile, avatarEmoji: emo };
                              setProfile(updated);
                            }}
                            className={`p-1.5 text-lg rounded-xl border transition ${profile.avatarEmoji === emo ? 'bg-zinc-800 border-zinc-600 scale-105' : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-white'}`}
                          >
                            {emo}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Gradient Background circles */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                        Escolha a Cor de Fundo
                      </label>
                      <div className="flex items-center gap-2">
                        {[
                          { name: 'from-zinc-805 to-black', color: 'bg-gradient-to-tr from-zinc-800 to-black' },
                          { name: 'from-neutral-700 to-neutral-900', color: 'bg-gradient-to-tr from-neutral-700 to-neutral-900' },
                          { name: 'from-stone-700 to-zinc-900', color: 'bg-gradient-to-tr from-stone-700 to-zinc-900' },
                          { name: 'from-emerald-900 to-teal-950', color: 'bg-gradient-to-tr from-emerald-900 to-teal-950' },
                          { name: 'from-cyan-900 to-blue-950', color: 'bg-gradient-to-tr from-cyan-905 to-blue-950' },
                          { name: 'from-amber-800 to-orange-950', color: 'bg-gradient-to-tr from-amber-800 to-orange-950' }
                        ].map((grad) => (
                          <button
                            key={grad.name}
                            type="button"
                            title={grad.name}
                            onClick={() => {
                              const updated = { ...profile, avatarColor: grad.name };
                              setProfile(updated);
                            }}
                            className={`w-7 h-7 rounded-full ${grad.color} border-2 transition ${profile.avatarColor === grad.name ? 'border-white scale-110 shadow-md' : 'border-transparent ring-1 ring-zinc-800'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Change Password Configuration Section */}
                <div className="pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (!sessionUser) {
                        showToast('Você precisa estar conectado via Supabase para alterar sua senha!', 'info');
                        return;
                      }
                      setShowPasswordSection(!showPasswordSection);
                    }}
                    className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5 select-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      <span>Alteração de Senha</span>
                    </div>
                    <span className="text-[9px] text-zinc-500">{showPasswordSection ? '▲' : '▼'}</span>
                  </button>

                  {showPasswordSection && sessionUser && (
                    <div className="mt-3 space-y-3 p-3 bg-zinc-950 rounded-2xl border border-zinc-850 animate-fade-in text-left">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 block uppercase tracking-wider">
                          Nova Senha Secreta
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo de 6 caracteres..."
                          className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:border-zinc-600 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 block uppercase tracking-wider">
                          Confirmar Nova Senha
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirme sua nova senha..."
                          className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:border-zinc-600 outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isUpdatingPassword}
                        onClick={async () => {
                          if (!newPassword || !confirmPassword) {
                            showToast('Por favor, preencha as senhas de alteração.', 'error');
                            return;
                          }
                          if (newPassword !== confirmPassword) {
                            showToast('As senhas digitadas não coincidem.', 'error');
                            return;
                          }
                          if (newPassword.length < 6) {
                            showToast('A redefinição exige no mínimo 6 caracteres.', 'error');
                            return;
                          }

                          setIsUpdatingPassword(true);
                          try {
                            const { error } = await supabase.auth.updateUser({
                              password: newPassword
                            });

                            if (error) {
                              showToast(`Falha ao salvar senha: ${error.message}`, 'error');
                            } else {
                              showToast('Sua senha foi redefinida com sucesso! 🔒', 'success');
                              setNewPassword('');
                              setConfirmPassword('');
                              setShowPasswordSection(false);
                            }
                          } catch (err: any) {
                            showToast(`Erro de conexão: ${err.message || err}`, 'error');
                          } finally {
                            setIsUpdatingPassword(false);
                          }
                        }}
                        className="w-full py-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-800 text-black font-extrabold text-[10px] rounded-xl border-none cursor-pointer uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                      >
                        {isUpdatingPassword ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-black" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Processando...</span>
                          </>
                        ) : (
                          <span>Salvar Nova Senha</span>
                        )}
                      </button>
                    </div>
                  )}

                  {!sessionUser && (
                    <p className="text-[8px] text-zinc-500 mt-2 leading-normal italic text-center select-none">
                      🔒 Senha: Disponível apenas no acesso autenticado via e-mail e Supabase.
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={async () => {
                  try {
                    saveUserProfileToStorage(profile);
                    if (sessionUser || supabaseConnected) {
                      const success = await saveUserProfileToSupabase(profile);
                      if (!success) {
                        console.warn('Não foi possível sincronizar o perfil com o Supabase, salvo localmente.');
                      }
                    }
                    showToast('Perfil profissional salvo com sucesso! ✨', 'success');
                    setShowProfileModal(false);
                  } catch (e) {
                    showToast('Ocorreu um erro ao salvar o perfil.', 'error');
                  }
                }}
                className="w-full py-2.5 bg-white hover:bg-zinc-100 text-black font-extrabold text-xs rounded-2xl border-none cursor-pointer shadow-md mt-2 uppercase tracking-widest"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {/* AGENTE C OPERATIONAL DRAWER */}
        {showAgentDrawer && (
          <div 
            className="fixed inset-0 z-50 flex justify-end bg-black/85 backdrop-blur-sm animate-fade-in font-sans"
            onClick={() => setShowAgentDrawer(false)}
          >
            <div 
              className="w-full max-w-sm h-full bg-[#0a0a0c] border-l border-zinc-900 p-6 flex flex-col justify-between shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-850 flex items-center justify-center relative">
                    <span className="text-sm font-black text-purple-400 font-mono">C</span>
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#0a0a0c]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Agente C</h3>
                    <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">NÚCLEO CONFIGURADO</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAgentDrawer(false)}
                  className="w-7 h-7 flex items-center justify-center bg-zinc-950 border border-zinc-900 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-850 cursor-pointer transition select-none text-[10px]"
                >
                  ✕
                </button>
              </div>

              {/* Chat Message Box */}
              <div className="flex-1 my-4 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                {agentMessages.map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div 
                      key={idx}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div className={`max-w-[85%] rounded-2xl p-3.5 ${isUser ? 'bg-white text-black rounded-tr-none' : 'bg-zinc-950 text-zinc-300 border border-zinc-900 rounded-tl-none'} text-xs leading-relaxed`}>
                        <p className="whitespace-pre-line font-medium">{msg.text}</p>
                        <span className={`text-[8px] font-mono block mt-1.5 ${isUser ? 'text-black/55' : 'text-zinc-650'}`}>
                          {msg.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {isAgentTyping && (
                  <div className="flex justify-start animate-pulse">
                    <div className="bg-zinc-950 text-zinc-500 border border-zinc-900 rounded-2xl rounded-tl-none p-3.5 text-[10px] uppercase font-bold tracking-widest">
                      C está computando...
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestions Chips */}
              <div className="pb-3 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
                {[
                  { label: "Novo de R$ 2.500", text: "C, cria um projeto pra Ana, 2500 reais, tá no roteiro" },
                  { label: "Mudar p/ Entregue", text: "Marca o projeto de Ana como entregue" },
                  { label: "Quantos ativos?", text: "Quanto tenho a receber esse mês?" }
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAgentInput(chip.text);
                    }}
                    className="px-3 py-1.5 bg-zinc-950 text-zinc-400 border border-zinc-900 text-[8px] uppercase tracking-wider font-extrabold rounded-lg hover:border-zinc-800 hover:text-white cursor-pointer transition select-none shrink-0"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Instruir Agente C..."
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSendAgentMessage();
                    }
                  }}
                  className="flex-1 px-3.5 py-3 bg-zinc-950 text-white placeholder-zinc-500 border border-zinc-900 rounded-2xl text-xs outline-none focus:border-zinc-700 transition font-sans"
                />
                <button
                  onClick={() => handleSendAgentMessage()}
                  className="px-4 bg-white text-black hover:bg-zinc-200 transition font-black text-xs rounded-2xl cursor-pointer shadow-md uppercase tracking-wider border-none"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HAMBURGER SIDEBAR MENU DRAWER */}
        {showMenuDrawer && (
          <div 
            className="fixed inset-0 z-50 flex justify-start bg-black/80 backdrop-blur-sm animate-fade-in"
            onClick={() => setShowMenuDrawer(false)}
          >
            <div 
              className="w-[280px] h-full bg-[#121215] border-r border-zinc-800 p-6 flex flex-col justify-between shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Close Button */}
              <button 
                onClick={() => setShowMenuDrawer(false)}
                className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full border-none cursor-pointer"
              >
                ✕
              </button>

              <div className="space-y-6">
                {/* Brand Header */}
                <div className="select-none flex items-center gap-2 border-b border-zinc-800 pb-4 mt-2">
                  <span className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm">🎬</span>
                  <div>
                    <h2 className="text-xl font-serif font-bold tracking-[0.1em] text-white">CREATIVE</h2>
                    <p className="text-[8px] tracking-wider text-zinc-500 font-sans font-bold uppercase">Produtividade Automática</p>
                  </div>
                </div>

                {/* Profile Widget */}
                <div 
                  onClick={() => {
                    setShowMenuDrawer(false);
                    setShowProfileModal(true);
                  }}
                  className="p-3 bg-zinc-950 hover:bg-zinc-900 rounded-2xl border border-zinc-850 flex items-center gap-3 transition cursor-pointer"
                >
                  <div className="w-[42px] h-[42px] rounded-full overflow-hidden border border-zinc-800 flex items-center justify-center text-white bg-zinc-900 relative">
                    {profile.avatarUrl ? (
                      <img 
                        src={profile.avatarUrl} 
                        alt={profile.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-tr ${profile.avatarColor || 'from-zinc-800 to-black'} flex items-center justify-center text-sm`}>
                        {profile.avatarEmoji || '🎥'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold text-white truncate uppercase font-sans">{profile.name || 'Criativo'}</p>
                    <p className="text-[8px] text-zinc-500 font-semibold font-sans uppercase">Ajustar Perfil</p>
                  </div>
                </div>

                {/* Quick Navigation Links */}
                <nav className="space-y-1.5 font-sans text-xs">
                  <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Painel de Acesso</p>
                  
                  <button
                    onClick={() => {
                      navigateToSection('dashboard');
                      setShowMenuDrawer(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl font-black uppercase tracking-wider flex items-center gap-3 transition cursor-pointer ${currentSection === 'dashboard' ? 'bg-zinc-805 bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span>Início</span>
                  </button>

                  <button
                    onClick={() => {
                      navigateToSection('clients');
                      setShowMenuDrawer(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl font-black uppercase tracking-wider flex items-center gap-3 transition cursor-pointer ${currentSection === 'clients' ? 'bg-zinc-805 bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder-closed"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M2 10h20"/></svg>
                    <span>Projetos & Contratos</span>
                  </button>

                  <button
                    onClick={() => {
                      navigateToSection('calendar');
                      setShowMenuDrawer(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl font-black uppercase tracking-wider flex items-center gap-3 transition cursor-pointer ${currentSection === 'calendar' ? 'bg-zinc-805 bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    <span>Agenda</span>
                  </button>

                  <button
                    onClick={() => {
                      navigateToSection('analytics');
                      setShowMenuDrawer(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl font-black uppercase tracking-wider flex items-center gap-3 transition cursor-pointer ${currentSection === 'analytics' ? 'bg-zinc-805 bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                    <span>Métricas</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowNotesModal(true);
                      setShowMenuDrawer(false);
                    }}
                    className="w-full text-left p-3 rounded-xl font-black uppercase tracking-wider flex items-center gap-3 transition cursor-pointer text-zinc-400 hover:text-white hover:bg-zinc-900/60"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    <span>Bloco de Notas</span>
                  </button>

                  <div className="h-px bg-zinc-850 my-2" />

                  {sessionUser ? (
                    <button
                      onClick={() => {
                        setShowMenuDrawer(false);
                        handleSignOut();
                      }}
                      className="w-full text-left p-3 rounded-xl font-black uppercase tracking-wider flex items-center gap-3 transition cursor-pointer text-[#EF4444] hover:bg-[#EF4444]/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                      <span>Sair do Studio</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setShowMenuDrawer(false);
                        localStorage.removeItem('creative_bypass_offline');
                        setBypassOffline(false);
                      }}
                      className="w-full text-left p-3 rounded-xl font-black uppercase tracking-wider flex items-center gap-3 transition cursor-pointer text-emerald-400 hover:bg-emerald-400/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-in"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                      <span>Entrar na Nuvem</span>
                    </button>
                  )}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* POPUP: NOTES MODAL (BLOCO DE NOTAS) */}
        {showNotesModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => {
              setShowNotesModal(false);
              setActiveNote(null);
            }}
          >
            <div 
              className="relative w-full max-w-sm bg-[#121215] rounded-[32px] p-6 border border-zinc-800 shadow-2xl space-y-4 max-h-[95vh] flex flex-col justify-between animate-scale-up text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3 border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  <div>
                    <h4 className="text-sm font-black text-white font-sans uppercase tracking-wider">
                      {activeNote ? 'Editar Nota' : 'Bloco de Notas'}
                    </h4>
                    <p className="text-[9px] text-zinc-400 font-sans">
                      {activeNote ? 'Editando seus rascunhos' : 'Anotações de Roteiros, Ideias e Insights'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setActiveNote(null);
                  }}
                  className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-full border-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {!activeNote ? (
                /* VIEW 1: NOTE LIST */
                <div className="flex-1 overflow-y-auto space-y-3 font-sans max-h-[60vh] pr-1">
                  {/* Plus button to add note */}
                  <button
                    onClick={() => {
                      const newN: Note = {
                        id: 'note_' + Date.now(),
                        content: '',
                        updatedAt: new Date().toISOString()
                      };
                      setActiveNote(newN);
                    }}
                    className="w-full py-3 bg-white hover:bg-zinc-100 text-black font-extrabold text-xs rounded-xl cursor-pointer shadow-md uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <span>✍️</span> Nova Nota
                  </button>

                  {notes.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      <p className="text-xs">Nenhuma nota cadastrada.</p>
                      <p className="text-[10px] mt-1">Clique em "Nova Nota" para começar!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-2">
                      {notes.map((note) => {
                        const preview = note.content.trim() 
                          ? note.content.substring(0, 60) + (note.content.length > 60 ? '...' : '') 
                          : '(Sem conteúdo)';
                        const formattedDate = note.updatedAt 
                          ? new Date(note.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + new Date(note.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                          : '';

                        return (
                          <div 
                            key={note.id}
                            className="p-3 bg-zinc-950 border border-zinc-850 hover:border-zinc-700 rounded-2xl flex items-start justify-between gap-3 group transition"
                          >
                            <div 
                              onClick={() => {
                                setActiveNote({ ...note });
                              }}
                              className="flex-1 cursor-pointer min-w-0"
                            >
                              <p className="text-xs font-medium text-white break-words whitespace-pre-wrap leading-tight">
                                {preview}
                              </p>
                              {formattedDate && (
                                <span className="text-[8px] text-zinc-500 block mt-1">
                                  {formattedDate}
                                </span>
                              )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {deletingNoteId === note.id ? (
                                <div className="flex items-center gap-1 bg-rose-950/20 border border-rose-900/30 p-1 px-2 rounded-xl animate-fade-in text-[9px] font-bold">
                                  <span className="text-rose-400 mr-1 uppercase text-[8px]">Apagar?</span>
                                  <button
                                    onClick={async () => {
                                      const updated = notes.filter(n => n.id !== note.id);
                                      setNotes(updated);
                                      saveNotesToStorage(updated);
                                      if (supabaseConnected && note.id) {
                                        await deleteNoteFromSupabase(note.id);
                                      }
                                      showToast('Nota removida com sucesso! 🗑️', 'success');
                                      setDeletingNoteId(null);
                                    }}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-black text-[9px] uppercase border-none cursor-pointer transition active:scale-95"
                                  >
                                    Sim
                                  </button>
                                  <button
                                    onClick={() => setDeletingNoteId(null)}
                                    className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-black text-[9px] uppercase border-none cursor-pointer transition"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setActiveNote({ ...note });
                                    }}
                                    className="p-1.5 text-zinc-400 hover:text-white transition rounded-lg hover:bg-zinc-800"
                                    title="Editar"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                  </button>
                                  <button
                                    onClick={() => setDeletingNoteId(note.id || null)}
                                    className="p-1.5 text-rose-400 hover:text-rose-300 transition rounded-lg hover:bg-rose-950/30"
                                    title="Apagar"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* VIEW 2: NOTE WRITER EDITOR */
                <div className="flex-1 overflow-y-auto space-y-3 font-sans relative flex flex-col justify-between">
                  <textarea
                    id="notes-modal-textarea"
                    value={activeNote.content}
                    onChange={(e) => setActiveNote({ ...activeNote, content: e.target.value })}
                    placeholder={`Digite suas ideias de roteiros, poses ou lembretes...`}
                    className="w-full h-80 p-3 bg-zinc-950 border border-zinc-850 rounded-2xl text-white placeholder-zinc-650 text-xs font-medium focus:border-zinc-500 outline-none leading-relaxed resize-none font-sans"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)',
                      backgroundSize: '100% 24px',
                      lineHeight: '24px'
                    }}
                  />
                  
                  <div className="text-[9px] text-zinc-500 font-sans flex items-center justify-between px-1">
                    {activeNote.updatedAt && (
                      <span>Alterada em: {new Date(activeNote.updatedAt).toLocaleDateString('pt-BR')} às {new Date(activeNote.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setActiveNote(null)}
                      className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white font-extrabold text-xs rounded-xl border border-zinc-800 cursor-pointer uppercase tracking-wider text-center"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={async () => {
                        if (!activeNote.content.trim()) {
                          showToast('Digite algum conteúdo antes de salvar!', 'error');
                          return;
                        }
                        const finalUpdatedNote: Note = {
                          ...activeNote,
                          updatedAt: new Date().toISOString()
                        };
                        
                        try {
                          const updatedList = notes.some(n => n.id === finalUpdatedNote.id)
                            ? notes.map(n => n.id === finalUpdatedNote.id ? finalUpdatedNote : n)
                            : [finalUpdatedNote, ...notes];
                          
                          setNotes(updatedList);
                          saveNotesToStorage(updatedList);
                          
                          if (supabaseConnected) {
                            await saveNoteToSupabase(finalUpdatedNote);
                          }
                          showToast('Nota salva com sucesso! ✨', 'success');
                          setActiveNote(null);
                        } catch (err) {
                          console.error('Erro ao salvar nota:', err);
                          showToast('Nota salva temporariamente no navegador!', 'info');
                          setActiveNote(null);
                        }
                      }}
                      className="flex-1 py-2.5 bg-white hover:bg-zinc-100 text-black font-extrabold text-xs rounded-xl cursor-pointer shadow-md uppercase tracking-wider text-center"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              )}

              {/* Just render direct buttons for list view cancel */}
              {!activeNote && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowNotesModal(false);
                      setActiveNote(null);
                    }}
                    className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white font-extrabold text-xs rounded-xl border border-zinc-800 cursor-pointer uppercase tracking-wider"
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <nav 
          className="absolute bottom-0 inset-x-0 bg-black border-t border-zinc-900 py-2 flex items-center justify-between z-40 px-5 rounded-none sm:rounded-b-[40px] font-sans h-16 hover:border-zinc-800 transition" 
          id="mobile-tab-deck"
          style={{ contentVisibility: 'auto' }}
        >
          {/* TAB 1: Clients list */}
          <button
            onClick={() => {
              navigateToSection('clients');
              setClientToEdit(null);
              setIsClientFormOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 bg-transparent border-none outline-none cursor-pointer flex-1 py-1"
            type="button"
          >
            <span className={`transition ${currentSection === 'clients' ? 'scale-105 text-white font-bold' : 'text-zinc-500 opacity-60'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-folder-closed"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M2 10h20"/></svg>
            </span>
            <span className={`text-[8px] font-black uppercase tracking-wider ${currentSection === 'clients' ? 'text-white' : 'text-zinc-500'}`}>
              Projetos
            </span>
          </button>

          {/* TAB 2: Calendar view */}
          <button
            onClick={() => {
              navigateToSection('calendar');
              setClientToEdit(null);
              setIsClientFormOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 bg-transparent border-none outline-none cursor-pointer flex-1 py-1"
            type="button"
          >
            <span className={`transition ${currentSection === 'calendar' ? 'scale-105 text-white font-bold' : 'text-zinc-500 opacity-60'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            </span>
            <span className={`text-[8px] font-black uppercase tracking-wider ${currentSection === 'calendar' ? 'text-white' : 'text-zinc-500'}`}>
              Agenda
            </span>
          </button>

          {/* TAB 3: Home dashboard - CENTRALIZED */}
          <button
            onClick={() => {
              navigateToSection('dashboard');
              setClientToEdit(null);
              setIsClientFormOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 bg-transparent border-none outline-none cursor-pointer flex-1 py-1"
            type="button"
          >
            <span className={`transition ${currentSection === 'dashboard' ? 'scale-105 text-white font-bold' : 'text-zinc-500 opacity-60'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </span>
            <span className={`text-[8px] font-black uppercase tracking-wider ${currentSection === 'dashboard' ? 'text-white' : 'text-zinc-500'}`}>
              Início
            </span>
          </button>

          {/* TAB 4: Agente C */}
          <button
            onClick={() => {
              setShowAgentDrawer(true);
            }}
            className="flex flex-col items-center gap-1.5 bg-transparent border-none outline-none cursor-pointer flex-1 py-1"
            type="button"
          >
            <span className={`transition ${showAgentDrawer ? 'scale-110 text-purple-450 font-bold font-mono' : 'text-zinc-500 opacity-60 hover:text-zinc-350'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles text-purple-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/><path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5Z"/><path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z"/></svg>
            </span>
            <span className={`text-[8px] font-black uppercase tracking-wider ${showAgentDrawer ? 'text-purple-400 font-bold' : 'text-zinc-500'}`}>
              Agente C
            </span>
          </button>

          {/* TAB 5: Analytics & Growth view */}
          <button
            onClick={() => {
              navigateToSection('analytics');
              setClientToEdit(null);
              setIsClientFormOpen(false);
            }}
            className="flex flex-col items-center gap-1.5 bg-transparent border-none outline-none cursor-pointer flex-1 py-1"
            type="button"
          >
            <span className={`transition ${currentSection === 'analytics' ? 'scale-105 text-white font-bold' : 'text-zinc-500 opacity-60'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
            </span>
            <span className={`text-[8px] font-black uppercase tracking-wider ${currentSection === 'analytics' ? 'text-white' : 'text-zinc-500'}`}>
              Métricas
            </span>
          </button>
        </nav>
      </div>

    </div>
  );
}
