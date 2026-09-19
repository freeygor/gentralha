import * as React from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ArrowLeft, Target, Award, Clock } from 'lucide-react';

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [userProfile, setUserProfile] = React.useState<{id: string, nome: string} | null>(null);
  const [userStats, setUserStats] = React.useState({
    totalMatches: 0,
    highScore: 0,
    avgPrecision: 0
  });
  const [globalRanking, setGlobalRanking] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate({ to: '/auth' });
          return;
        }

        // Get profile
        const { data: profile } = await supabase
          .from('perfis')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile) setUserProfile(profile);

        // Get user personal stats
        const { data: myMatches } = await supabase
          .from('aim_sessoes')
          .select('pontuacao, precisao')
          .eq('perfil_id', session.user.id);

        if (myMatches && myMatches.length > 0) {
          const bestScore = Math.max(...myMatches.map(m => m.pontuacao || 0));
          const totalPrecision = myMatches.reduce((acc, curr) => acc + Number(curr.precisao || 0), 0);
          setUserStats({
            totalMatches: myMatches.length,
            highScore: bestScore,
            avgPrecision: Math.round(totalPrecision / myMatches.length)
          });
        }

        // Get global ranking top 10
        const { data: rankingData } = await supabase
          .from('aim_sessoes')
          .select(`
            id, pontuacao, precisao, criado_em,
            perfis ( nome )
          `)
          .order('pontuacao', { ascending: false })
          .limit(10);

        if (rankingData) setGlobalRanking(rankingData);
      } catch (error) {
        console.error('Erro ao carregar dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-muted rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </Link>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard e Ranking</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            Jogador: <span className="font-bold text-foreground">{userProfile?.nome || 'Anônimo'}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 flex flex-col md:flex-row gap-8">
        
        {/* Coluna Esquerda: Estatísticas Pessoais */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-primary" /> Seu Desempenho
          </h2>

          <div className="bg-card border border-border p-6 rounded-xl shadow-sm text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground uppercase font-semibold mb-1">Maior Pontuação</p>
            <p className="text-4xl font-mono font-black text-foreground">{userStats.highScore}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Partidas</p>
              <p className="text-2xl font-mono font-bold text-foreground">{userStats.totalMatches}</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm text-center">
              <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Precisão Média</p>
              <p className="text-2xl font-mono font-bold text-foreground">{userStats.avgPrecision}%</p>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Ranking Global */}
        <div className="w-full md:w-2/3 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> Ranking Global Top 10
          </h2>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {globalRanking.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma sessão registrada ainda no servidor.
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">#</th>
                    <th className="py-3 px-4">Jogador</th>
                    <th className="py-3 px-4">Pontuação</th>
                    <th className="py-3 px-4">Precisão</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {globalRanking.map((session, index) => (
                    <tr key={session.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-4 px-4 text-center font-bold text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="py-4 px-4 font-semibold text-foreground">
                        {session.perfis?.nome || 'Desconhecido'}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-primary">
                        {session.pontuacao}
                      </td>
                      <td className="py-4 px-4">
                        {session.precisao}%
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground hidden sm:table-cell">
                        {new Date(session.criado_em).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
