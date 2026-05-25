import { createClient } from '@supabase/supabase-js';
import { Client, Appointment, Note, UserProfile } from './types';

// Standard Supabase credentials provided by the user
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || 'https://xnjypncuzsuzppivcmgt.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_R-Dk9bSuLs60opCzT6jWEw_M_MICpP2';

// Ensure we pass the base URL to Supabase client
const cleanUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');

export const supabase = createClient(cleanUrl, SUPABASE_ANON_KEY);

// SQL script to help user set up tables in Supabase Console
export const SUPABASE_SETUP_SQL = `-- SCRIPT DE CONFIGURAÇÃO DO BANCO DE DADOS (CREATIVE)
-- Copie e cole este script na aba "SQL Editor" do Supabase e clique em "Run"

-- Ativar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIL DO USUÁRIO
-- Cada usuário cadastrado no Supabase Auth tem exatamente um perfil, com chave primária igual ao ID do usuário do Auth.
CREATE TABLE IF NOT EXISTS public.user_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    avatar_emoji TEXT,
    avatar_color TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que as colunas 'user_id' existam nas tabelas caso elas já tenham sido criadas anteriormente pelo modo offline anterior
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- Ativar Segurança de Linhas (Row Level Security - RLS)
ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Permissões do usuário (cada um vê e edita apenas a si mesmo com cast ::text explícito)
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.user_profile;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.user_profile
    FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.user_profile;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.user_profile
    FOR ALL USING (auth.uid()::text = id::text) WITH CHECK (auth.uid()::text = id::text);


-- 2. TABELA DE CLIENTES PARTICIONADO POR USUÁRIO
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    service TEXT NOT NULL,
    total_value DOUBLE PRECISION DEFAULT 0,
    paid_value DOUBLE PRECISION DEFAULT 0,
    payment_status TEXT NOT NULL,
    progress TEXT NOT NULL,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissões de RLS para Clientes (usando cast ::text para evitar erros de tipo)
DROP POLICY IF EXISTS "Usuários podem selecionar seus próprios clientes" ON public.clients;
CREATE POLICY "Usuários podem selecionar seus próprios clientes" ON public.clients
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios clientes" ON public.clients;
CREATE POLICY "Usuários podem gerenciar seus próprios clientes" ON public.clients
    FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);


-- 3. TABELA DE AGENDAMENTOS PARTICIONADO POR USUÁRIO
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    client_id TEXT NOT NULL,
    custom_title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    status TEXT NOT NULL,
    observations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissões de RLS para Agendamentos (usando cast ::text para evitar erros de tipo)
DROP POLICY IF EXISTS "Usuários podem selecionar seus próprios agendamentos" ON public.appointments;
CREATE POLICY "Usuários podem selecionar seus próprios agendamentos" ON public.appointments
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios agendamentos" ON public.appointments;
CREATE POLICY "Usuários podem gerenciar seus próprios agendamentos" ON public.appointments
    FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);


-- 4. TABELA DE ANOTAÇÕES PARTICIONADA POR USUÁRIO
CREATE TABLE IF NOT EXISTS public.notes (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    content TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissões de RLS para Notas (usando cast ::text para evitar erros de tipo)
DROP POLICY IF EXISTS "Usuários podem ver suas próprias notas" ON public.notes;
CREATE POLICY "Usuários podem ver suas próprias notas" ON public.notes
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias notas" ON public.notes;
CREATE POLICY "Usuários podem gerenciar suas próprias notas" ON public.notes
    FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text);
`;

// Helper dynamically fetch currently logged-in user
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user ? user.id : null;
  } catch (err) {
    console.error('Erro ao ler usuário ativo do Supabase:', err);
    return null;
  }
}

// Helper functions for easy sync mapping
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_profile').select('id').limit(1);
    if (error && error.code === 'PGRST116') {
      return true;
    }
    if (error && error.message.includes('relation "public.user_profile" does not exist')) {
      console.warn('Tabela user_profile não criada ainda, conexão OK, mas precisa rodar SQL.');
      return true; // Connection works but tables missing
    }
    if (error) {
      console.warn('Conexão ao Supabase aceita, mas erro retornado:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Falha ao conectar no Supabase:', err);
    return false;
  }
}

// ---------------- CLIENTS DATABASE SYNC ----------------

export async function fetchClientsFromSupabase(): Promise<Client[] | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar clientes no Supabase:', error);
      return null;
    }

    // Map DB snake_case structure back to the TS CamelCase Client objects
    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      contact: row.contact,
      service: row.service,
      totalValue: row.total_value,
      paidValue: row.paid_value,
      paymentStatus: row.payment_status,
      progress: row.progress,
      observations: row.observations || '',
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Erro de rede ao carregar clientes do Supabase:', err);
    return null;
  }
}

export async function saveClientToSupabase(client: Client): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const dbRow = {
      id: client.id,
      user_id: userId,
      name: client.name,
      contact: client.contact,
      service: client.service,
      total_value: client.totalValue,
      paid_value: client.paidValue,
      payment_status: client.paymentStatus,
      progress: client.progress,
      observations: client.observations,
      created_at: client.createdAt || new Date().toISOString()
    };

    const { error } = await supabase.from('clients').upsert(dbRow);
    if (error) {
      console.error('Erro ao salvar cliente no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro de rede ao salvar cliente no Supabase:', err);
    return false;
  }
}

export async function deleteClientFromSupabase(clientId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const { error } = await supabase.from('clients').delete().eq('id', clientId).eq('user_id', userId);
    if (error) {
      console.error('Erro ao remover cliente do Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro de rede ao remover cliente do Supabase:', err);
    return false;
  }
}


// ---------------- APPOINTMENTS DATABASE SYNC ----------------

export async function fetchAppointmentsFromSupabase(): Promise<Appointment[] | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Erro ao buscar agendamentos no Supabase:', error);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      clientId: row.client_id,
      customTitle: row.custom_title || '',
      date: row.date,
      time: row.time || '',
      status: row.status,
      observations: row.observations || ''
    }));
  } catch (err) {
    console.error('Erro de rede ao carregar agendamentos do Supabase:', err);
    return null;
  }
}

export async function saveAppointmentToSupabase(appointment: Appointment): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const dbRow = {
      id: appointment.id,
      user_id: userId,
      client_id: appointment.clientId,
      custom_title: appointment.customTitle || '',
      date: appointment.date,
      time: appointment.time || '',
      status: appointment.status,
      observations: appointment.observations || ''
    };

    const { error } = await supabase.from('appointments').upsert(dbRow);
    if (error) {
      console.error('Erro ao salvar agendamento no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro de rede ao salvar agendamento no Supabase:', err);
    return false;
  }
}

export async function deleteAppointmentFromSupabase(appointmentId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const { error } = await supabase.from('appointments').delete().eq('id', appointmentId).eq('user_id', userId);
    if (error) {
      console.error('Erro ao deletar agendamento do Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro de rede ao deletar agendamento no Supabase:', err);
    return false;
  }
}


// ---------------- NOTE DATABASE SYNC ----------------

export async function fetchNotesFromSupabase(): Promise<Note[] | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar bloco de notas no Supabase:', error);
      return null;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      content: row.content,
      updatedAt: row.updated_at
    }));
  } catch (err) {
    console.error('Erro de rede ao buscar bloco de notas no Supabase:', err);
    return null;
  }
}

export async function fetchNoteFromSupabase(): Promise<Note | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .eq('id', 'quick_note_' + userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Erro ao buscar bloco de notas no Supabase:', error);
      }
      return null;
    }

    if (data) {
      return {
        id: data.id,
        content: data.content,
        updatedAt: data.updated_at
      };
    }
    return null;
  } catch (err) {
    console.error('Erro de rede ao buscar bloco de notas no Supabase:', err);
    return null;
  }
}

export async function saveNoteToSupabase(note: Note): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const dbRow = {
      id: 'quick_note_' + userId,
      user_id: userId,
      content: note.content,
      updated_at: note.updatedAt || new Date().toISOString()
    };

    const { error } = await supabase.from('notes').upsert(dbRow);
    if (error) {
      console.error('Erro ao salvar bloco de notas no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro de rede ao salvar bloco de notas no Supabase:', err);
    return false;
  }
}

export async function deleteNoteFromSupabase(noteId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('user_id', userId);
    if (error) {
      console.error('Erro ao deletar bloco de notas no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro de rede ao deletar bloco de notas no Supabase:', err);
    return false;
  }
}

// ---------------- USER PROFILE DATABASE SYNC ----------------

export async function fetchUserProfileFromSupabase(): Promise<UserProfile | null> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return null;
    const { data, error } = await supabase
      .from('user_profile')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil do usuário no Supabase:', error);
      }
      return null;
    }

    if (data) {
      return {
        name: data.name,
        avatarUrl: data.avatar_url || '',
        avatarEmoji: data.avatar_emoji || '👩‍🎨',
        avatarColor: data.avatar_color || 'from-purple-500 to-indigo-600'
      };
    }
    return null;
  } catch (err) {
    console.error('Erro de rede ao carregar perfil do usuário no Supabase:', err);
    return null;
  }
}

export async function saveUserProfileToSupabase(profile: UserProfile): Promise<boolean> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    const dbRow = {
      id: userId,
      name: profile.name,
      avatar_url: profile.avatarUrl || '',
      avatar_emoji: profile.avatarEmoji || '👩‍🎨',
      avatar_color: profile.avatarColor || 'from-purple-500 to-indigo-600',
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('user_profile').upsert(dbRow);
    if (error) {
      console.error('Erro ao salvar perfil do usuário no Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Erro de rede ao salvar perfil do usuário no Supabase:', err);
    return false;
  }
}

