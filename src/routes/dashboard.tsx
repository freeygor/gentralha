import * as React from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ArrowLeft, Target, Award, History, TrendingUp } from 'lucide-react';

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
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4"><Link to="/" className="p-2 hover:bg-muted rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-muted-foreground" /></Link><h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard e Ranking</h1></div>
          <div className="text-sm text-muted-foreground hidden sm:block">Jogador: <span className="font-bold text-foreground">{userProfile?.nome || 'Anônimo'}</span></div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm"><div className="flex items-center justify-between mb-4"><p className="text-sm text-muted-foreground uppercase font-semibold">Maior Pontuação</p><Award className="w-5 h-5 text-primary" /></div><p className="text-4xl font-mono font-black text-foreground">{userStats.highScore}</p></div>
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm"><div className="flex items-center justify-between mb-4"><p className="text-sm text-muted-foreground uppercase font-semibold">Partidas</p><Target className="w-5 h-5 text-primary" /></div><p className="text-4xl font-mono font-black text-foreground">{userStats.totalMatches}</p></div>
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm"><div className="flex items-center justify-between mb-4"><p className="text-sm text-muted-foreground uppercase font-semibold">Precisão Média</p><TrendingUp className="w-5 h-5 text-primary" /></div><p className="text-4xl font-mono font-black text-foreground">{userStats.avgPrecision}%</p></div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Histórico de sessões</h2>
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {history.length === 0 ? <div className="p-8 text-center text-muted-foreground">Você ainda não possui sessões registradas.</div> : <div className="divide-y divide-border">{history.slice(0, 8).map((match) => <div key={match.id} className="p-4 flex items-center justify-between gap-3"><div><p className="font-bold text-foreground">{match.pontuacao} pontos</p><p className="text-xs text-muted-foreground mt-1">{new Date(match.criado_em).toLocaleDateString('pt-BR')} · {match.acertos} acertos · {match.erros} erros</p></div><div className="text-right"><p className="font-mono font-bold text-primary">{Number(match.precisao || 0)}%</p><p className="text-xs text-muted-foreground">precisão</p></div></div>)}</div>}
            </div>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Ranking Global Top 10</h2>
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
              {globalRanking.length === 0 ? <div className="p-8 text-center text-muted-foreground">Nenhuma sessão registrada ainda no servidor.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="py-3 px-4 w-16 text-center">#</th><th className="py-3 px-4">Jogador</th><th className="py-3 px-4">Pontuação</th><th className="py-3 px-4">Precisão</th><th className="py-3 px-4 hidden sm:table-cell">Data</th></tr></thead><tbody className="divide-y divide-border">{globalRanking.map((entry, index) => <tr key={entry.id} className="hover:bg-muted/50 transition-colors"><td className="py-4 px-4 text-center font-bold text-muted-foreground">{index + 1}</td><td className="py-4 px-4 font-semibold text-foreground">{entry.perfis?.nome || 'Desconhecido'}</td><td className="py-4 px-4 font-mono font-bold text-primary">{entry.pontuacao}</td><td className="py-4 px-4">{Number(entry.precisao || 0)}%</td><td className="py-4 px-4 text-sm text-muted-foreground hidden sm:table-cell">{new Date(entry.criado_em).toLocaleDateString('pt-BR')}</td></tr>)}</tbody></table></div>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
