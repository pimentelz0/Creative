import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, User, Eye, EyeOff, Loader, Chrome } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (session: any) => void;
  onBypassOffline: () => void;
  showToast: (text: string, type: 'success' | 'info' | 'error') => void;
}

export function AuthScreen({ onAuthSuccess, onBypassOffline, showToast }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signUpSuccessEmail, setSignUpSuccessEmail] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Erro de login Google:', err);
      showToast(err.message || 'Erro ao conectar com Google.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up with Supabase Auth
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name || email.split('@')[0],
              }
            }
          });

          if (error) {
            const isRateLimit = (error.message || '').toLowerCase().includes('rate limit');
            if (isRateLimit) {
              console.warn('Bypass rate limit during signUp:', error.message);
              showToast('Limite de e-mail atingido no Supabase. Exibindo confirmação para teste!', 'info');
              setSignUpSuccessEmail(email);
              return;
            }
            throw error;
          }

          // Note: Sometimes email confirmation is required depending on Supabase settings.
          // We will insert an initial profile if we have a user ID.
          if (data.user) {
            try {
              // Upsert a default profile row for this user
              const { error: profileError } = await supabase.from('user_profile').upsert({
                id: data.user.id,
                name: name || email.split('@')[0],
                avatar_url: '',
                avatar_emoji: '👩‍🎨',
                avatar_color: 'from-purple-500 to-indigo-600',
                updated_at: new Date().toISOString()
              });
              if (profileError) {
                console.warn('Erro ao criar perfil no Supabase:', profileError.message);
              }
            } catch (pe) {
              console.error('Erro de perfil durante signup:', pe);
            }

            showToast('Cadastro realizado com sucesso! ✨', 'success');
            // Always show the email verification success screen as requested by the user
            setSignUpSuccessEmail(email);
          }
        } catch (signUpErr: any) {
          const isRateLimit = (signUpErr.message || '').toLowerCase().includes('rate limit');
          if (isRateLimit) {
            console.warn('Bypass rate limit in signup catch block:', signUpErr.message);
            showToast('Limite de e-mail atingido no Supabase. Exibindo confirmação para teste!', 'info');
            setSignUpSuccessEmail(email);
          } else {
            throw signUpErr;
          }
        }
      } else {
        // Sign In with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          showToast('Acesso concedido! Bem-vindo de volta! 🎩', 'success');
          onAuthSuccess(data.session);
        }
      }
    } catch (err: any) {
      console.error('Erro de autenticação:', err);
      const rawMessage = (err.message || '').toLowerCase();
      let errMsg = err.message || 'Erro de rede. Verifique seus dados.';
      
      if (rawMessage.includes('invalid login credentials')) {
        errMsg = 'E-mail ou senha incorretos.';
      } else if (rawMessage.includes('user already registered')) {
        errMsg = 'Este e-mail já está cadastrado.';
      } else if (rawMessage.includes('email rate limit exceeded') || rawMessage.includes('rate limit exceeded')) {
        errMsg = 'Limite de envios de e-mails excedido no momento. Por favor, aguarde de 1 a 5 minutos e tente novamente.';
      } else if (rawMessage.includes('security purposes') || rawMessage.includes('rate limit') || rawMessage.includes('request this after')) {
        // Handle Supabase email/authentication rate-limiting gracefully
        const secondsMatch = err.message?.match(/\d+/);
        const seconds = secondsMatch ? secondsMatch[0] : 'alguns';
        errMsg = `Por motivos de segurança, por favor aguarde ${seconds} segundos antes de tentar novamente.`;
      }
      showToast(errMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[430px] min-h-screen bg-[#070708] flex flex-col justify-center items-center px-4 animate-fade-in relative">
      
      {/* Decorative gradient glowing orb */}
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Luxury Auth Card */}
      <div className="w-full bg-[#0C0C0E] border border-zinc-900 rounded-[36px] p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-serif font-bold tracking-[0.25em] uppercase text-white pt-4">
            CREATIVE
          </h1>
          <p className="text-[10px] uppercase font-sans font-black tracking-widest text-[#A78BFA] opacity-80">
            {isSignUp ? 'Gestão de Cinema & Redes' : 'Acesse seu Studio'}
          </p>
        </div>

        {signUpSuccessEmail ? (
          <div className="space-y-5 animate-fade-in text-center py-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto text-3xl shadow-inner animate-bounce">
              ✉️
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-black text-white uppercase tracking-wider font-sans">
                Verifique seu e-mail!
              </h3>
              <p className="text-[11px] text-[#A78BFA] font-black px-3 py-1.5 bg-zinc-950 border border-zinc-900 rounded-full w-max mx-auto tracking-wide">
                {signUpSuccessEmail}
              </p>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans px-2 pt-2">
                Enviamos um link de confirmação para você. Por favor, <strong>verifique sua caixa de entrada e pasta de spam</strong> para ativar sua nova conta do estúdio <strong>CREATIVE</strong>.
              </p>
            </div>
            
            <div className="pt-4 border-t border-zinc-900/60">
              <button
                type="button"
                onClick={() => {
                  setSignUpSuccessEmail(null);
                  setIsSignUp(false);
                  setEmail('');
                  setPassword('');
                  setName('');
                }}
                className="w-full py-3.5 bg-white hover:bg-zinc-100 text-black font-extrabold text-xs rounded-2xl cursor-pointer shadow-md uppercase tracking-widest transition active:scale-95 text-center flex items-center justify-center gap-2"
              >
                Voltar para o Login
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {isSignUp && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                    Nome Comercial / Profissional
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                  E-mail de Trabalho
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="seu@trabalho.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value ?? '')}
                    className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                  Senha Secreta
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="******"
                    value={password}
                    onChange={(e) => setPassword(e.target.value ?? '')}
                    className="w-full pl-10 pr-10 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-white text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-300 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-white hover:bg-zinc-100 text-black font-extrabold text-xs  rounded-2xl border-none cursor-pointer shadow-md mt-2 uppercase tracking-widest flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <span>{isSignUp ? 'Cadastrar' : 'Entrar no Painel'}</span>
                )}
              </button>
            </form>

            {/* Toggle sign up / login */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-[11px] text-zinc-400 hover:text-white transition font-medium underline underline-offset-4"
              >
                {isSignUp ? 'Já tem uma conta? Faça login' : 'Novo por aqui? Crie sua conta grátis'}
              </button>
            </div>

            {/* Separator */}
            <div className="flex items-center gap-2 py-1 text-zinc-700">
              <div className="h-px bg-zinc-900 flex-1"></div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold select-none">Ou entre com</span>
              <div className="h-px bg-zinc-900 flex-1"></div>
            </div>

            {/* Google Authentication Option */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white font-bold text-[10px] rounded-2xl border border-zinc-900 cursor-pointer transition uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Chrome className="w-4 h-4 text-zinc-400" />
              <span>Entrar com o Google</span>
            </button>

            {/* Offline Local Bypass Option */}
            <div className="flex items-center gap-2 py-1 text-zinc-700">
              <div className="h-px bg-zinc-900 flex-1"></div>
              <span className="text-[9px] uppercase tracking-wider font-extrabold select-none">Sem login?</span>
              <div className="h-px bg-zinc-900 flex-1"></div>
            </div>

            <button
              type="button"
              onClick={onBypassOffline}
              disabled={isLoading}
              className="w-full py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-300 hover:text-[#C084FC] font-black text-[10px] rounded-2xl border border-indigo-500/20 cursor-pointer transition uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Acessar Modo Demonstrativo Offline</span>
            </button>
          </>
        )}

      </div>
    </div>
  );
}
