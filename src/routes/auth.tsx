import * as React from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const Route = createFileRoute('/auth')({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [nome, setNome] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate({ to: '/' });
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (signInError) throw signInError;
        navigate({ to: '/' });
      } else {
        if (!nome) throw new Error('O nome é obrigatório para registro.');
        
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password 
        });
        if (signUpError) throw signUpError;
        
        if (data.user) {
          const { error: profileError } = await supabase.from('perfis').insert({
            id: data.user.id,
            nome: nome
          });
          if (profileError) {
            console.error('Erro ao salvar perfil:', profileError);
          }
        }
        navigate({ to: '/' });
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative font-sans overflow-hidden">
      {/* Fundo imersivo */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{ 
          backgroundImage: 'url("/uploads/gen_banner_smoke.png")', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        }} 
      />

      <Link 
        to="/"
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-zinc-400 hover:text-green-500 transition-colors bg-zinc-900/50 backdrop-blur-sm px-4 py-2 rounded-full border border-green-900/30"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Quartel
      </Link>

      <div className="w-full max-w-md bg-zinc-900/90 backdrop-blur-md border border-green-900/50 rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.1)] overflow-hidden relative z-10">
        <div className="p-8 text-center border-b border-green-900/30 bg-black/40">
          <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-xl mb-6 bg-black border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.4)] overflow-hidden">
             <img src="/uploads/gen_logo_smoke.png" alt="Gentralha Logo" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-wider uppercase">
            Gentralha <span className="text-green-500">Aim</span>
          </h2>
          <p className="text-green-400/80 mt-2 font-medium tracking-wide">
            {isLogin ? 'Autenticação Necessária' : 'Alistamento na Elite'}
          </p>
        </div>

        <div className="p-8">
          <div className="flex rounded-lg bg-zinc-950/50 p-1 mb-8 border border-zinc-800">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider rounded-md transition-all ${isLogin ? 'bg-green-600 shadow-md text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Acessar
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-wider rounded-md transition-all ${!isLogin ? 'bg-green-600 shadow-md text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Registrar
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-950/50 border border-red-500/30 rounded-lg flex items-start gap-3 backdrop-blur-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Codinome</label>
                <input 
                  type="text" 
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all placeholder:text-zinc-600"
                  placeholder="Ex: ToxicSniper"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Rede (E-mail)</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all placeholder:text-zinc-600"
                placeholder="agente@gentralha.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Chave de Acesso</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950/80 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-all placeholder:text-zinc-600"
                 placeholder="••••••••"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 mt-8 bg-green-600 text-white font-black uppercase tracking-widest rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
              {loading ? 'Processando...' : (isLogin ? 'Iniciar Sessão' : 'Criar Perfil')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
