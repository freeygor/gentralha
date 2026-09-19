import * as React from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ArrowLeft, Target, Award, History, TrendingUp, Skull } from 'lucide-react';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

type UserStats = {
  totalMatches: number;
  highScore: number;
  avgPrecision: number;
};

type SessionRecord = {
  id: string;
  pontuacao: number;
  precisao: number | null;
  acertos: number;
  erros: number;
  modo: string;
  duracao: number;
  criado_em: string;
};

function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [userProfile, setUserProfile] = React.useState<{ id: string; nome: string | null } | null>(null);
  const [userStats, setUserStats] = React.useState<UserStats>({ totalMatches: 0, highScore: 0, avgPrecision: 0 });
  const [history, setHistory] = React.useState<SessionRecord[]>([]);
  const [globalRanking, setGlobalRanking] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate({ to: '/auth' });
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('perfis')
          .select('id, nome')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile) setUserProfile(profile);

        const { data: myMatches, error: matchesError } = await supabase
          .from('aim_sessoes')
          .select('id, pontuacao, precisao, acertos, erros, modo, duracao, criado_em')
          .eq('perfil_id', session.user.id)
          .order('criado_em', { ascending: false });

        if (matchesError) throw matchesError;

        if (myMatches) {
          setHistory(myMatches);
          const bestScore = Math.max(0, ...myMatches.map((match) => match.pontuacao || 0));
          const totalPrecision = myMatches.reduce((accumulator, match) => accumulator + Number(match.precisao || 0), 0);
          setUserStats({
            totalMatches: myMatches.length,
            highScore: bestScore,
            avgPrecision: myMatches.length > 0 ? Math.round(totalPrecision / myMatches.length) : 0,
          });
        }

        const { data: rankingData, error: rankingError } = await supabase
          .from('aim_sessoes')
          .select('id, pontuacao, precisao, criado_em, perfis ( nome )')
          .order('pontuacao', { ascending: false })
          .limit(10);

        if (rankingError) throw rankingError;
        if (rankingData) setGlobalRanking(rankingData);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-pulse bg-black mb-4">
          <img src="/uploads/gen_logo_smoke.png" alt="Carregando..." className="w-full h-full object-cover" />
        </div>
        <p className="text-green-500 font-mono font-bold uppercase tracking-widest">Carregando Dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans relative overflow-hidden">
       {/* Fundo temático geral */}
       <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{ 
          backgroundImage: 'url("/uploads/gen_banner_smoke.png")', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundAttachment: 'fixed'
        }} 
      />

      <header className="relative z-10 border-b border-green-900/40 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-zinc-800 rounded-full transition-colors border border-transparent hover:border-green-900/50">
              <ArrowLeft className="w-5 h-5 text-green-500" />
            </Link>
            <h1 className="text-xl font-black text-white tracking-wider uppercase">
              Central <span className="text-green-500">de Dados</span>
            </h1>
          </div>
          <div className="text-sm text-zinc-400 hidden sm:flex items-center gap-2">
            Agente: <span className="font-bold text-green-400 px-3 py-1 bg-green-500/10 rounded border border-green-500/20">{userProfile?.nome || 'Anônimo'}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900/80 backdrop-blur border border-green-900/30 p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><Award className="w-24 h-24 text-green-500" /></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-green-400 uppercase font-bold tracking-wider">Recorde Pessoal</p>
                <Award className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-5xl font-mono font-black text-white drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">{userStats.highScore}</p>
            </div>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur border border-green-900/30 p-6 rounded-xl shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Target className="w-24 h-24 text-green-500" /></div>
             <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-green-400 uppercase font-bold tracking-wider">Missões Concluídas</p>
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-5xl font-mono font-black text-white">{userStats.totalMatches}</p>
            </div>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur border border-green-900/30 p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-24 h-24 text-green-500" /></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-green-400 uppercase font-bold tracking-wider">Eficácia Média</p>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-5xl font-mono font-black text-white">{userStats.avgPrecision}<span className="text-2xl text-green-500">%</span></p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <History className="w-5 h-5 text-green-500" /> Registros Recentes
            </h2>
            <div className="bg-zinc-900/80 backdrop-blur border border-green-900/30 rounded-xl shadow-lg overflow-hidden">
              {history.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 italic">
                  <Skull className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  Inicie o treinamento para gerar registros.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {history.slice(0, 8).map((match) => (
                    <div key={match.id} className="p-4 flex items-center justify-between gap-3 hover:bg-zinc-800/50 transition-colors">
                      <div>
                        <p className="font-black text-white text-lg">{match.pontuacao} <span className="text-xs text-green-500 font-sans uppercase font-bold">pts</span></p>
                        <p className="text-xs text-zinc-400 mt-1 font-medium">
                          {new Date(match.criado_em).toLocaleDateString('pt-BR')} <span className="text-zinc-600">|</span> <span className="text-green-400">{match.acertos} hit</span> <span className="text-zinc-600">|</span> <span className="text-red-400">{match.erros} miss</span>
                        </p>
                      </div>
                      <div className="text-right bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
                        <p className="font-mono font-bold text-green-500">{Number(match.precisao || 0)}%</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">precisão</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-4">
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" /> Elite Global - Top 10
            </h2>
            <div className="bg-zinc-900/80 backdrop-blur border border-green-900/30 rounded-xl shadow-lg overflow-hidden">
              {globalRanking.length === 0 ? (
                 <div className="p-8 text-center text-zinc-500 italic">
                   Rede global indisponível no momento.
                 </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-950/80 text-xs uppercase text-zinc-400 tracking-wider border-b border-green-900/30">
                      <tr>
                        <th className="py-4 px-4 w-16 text-center font-black">Rank</th>
                        <th className="py-4 px-4 font-black">Agente</th>
                        <th className="py-4 px-4 font-black">Score Máximo</th>
                        <th className="py-4 px-4 font-black">Rate</th>
                        <th className="py-4 px-4 hidden sm:table-cell font-black">Registro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {globalRanking.map((entry, index) => (
                        <tr key={entry.id} className="hover:bg-zinc-800/80 transition-colors group">
                          <td className="py-4 px-4">
                            <div className={`w-8 h-8 mx-auto flex items-center justify-center rounded-md font-black text-sm
                              ${index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 
                                index === 1 ? 'bg-zinc-300/20 text-zinc-300 border border-zinc-400/50' : 
                                index === 2 ? 'bg-amber-700/20 text-amber-500 border border-amber-700/50' : 
                                'text-zinc-500 font-bold'}`}
                            >
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-4 px-4 font-bold text-white group-hover:text-green-100 transition-colors">{entry.perfis?.nome || 'Desconhecido'}</td>
                          <td className="py-4 px-4 font-mono font-black text-green-500 text-lg">{entry.pontuacao}</td>
                          <td className="py-4 px-4 font-medium text-zinc-300">{Number(entry.precisao || 0)}%</td>
                          <td className="py-4 px-4 text-sm text-zinc-500 hidden sm:table-cell font-medium">{new Date(entry.criado_em).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
