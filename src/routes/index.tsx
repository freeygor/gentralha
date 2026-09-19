import * as React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Target, Clock, Activity, Crosshair, HelpCircle, Trophy, User, LogOut } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: AimTrainer,
});

function AimTrainer() {
  const [gameState, setGameState] = React.useState<'idle' | 'playing' | 'finished'>('idle');
  const [score, setScore] = React.useState(0);
  const [hits, setHits] = React.useState(0);
  const [misses, setMisses] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(30);
  const [targetPos, setTargetPos] = React.useState({ x: 50, y: 50 });
  const [session, setSession] = React.useState<any>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const spawnTarget = React.useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const targetSize = 48; // equivalante ao w-12 e h-12
    const max_x = w - targetSize;
    const max_y = h - targetSize;
    
    setTargetPos({
      x: Math.max(0, Math.random() * max_x),
      y: Math.max(0, Math.random() * max_y)
    });
  }, []);

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      setGameState('finished');
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  React.useEffect(() => {
    if (gameState === 'finished') {
      saveSession(hits, misses, score);
    }
  }, [gameState, hits, misses, score]);

  const saveSession = async (finalHits: number, finalMisses: number, finalScore: number) => {
    try {
      if (!session?.user?.id) {
        console.log("Sessão de usuário não encontrada, o progresso não será salvo.");
        return;
      }

      const total = finalHits + finalMisses;
      let precision = 0;
      if (total > 0) {
        precision = Number(((finalHits / total) * 100).toFixed(2));
      }

      const { error } = await supabase.from('aim_sessoes').insert({
        perfil_id: session.user.id,
        modo: 'classico',
        duracao: 30,
        pontuacao: finalScore,
        acertos: finalHits,
        erros: finalMisses,
        precisao: precision
      });

      if (error) {
        console.error("Erro do Supabase ao salvar a sessão:", error.message);
      }
    } catch (err) {
      console.error("Erro inesperado ao salvar os resultados:", err);
    }
  };

  const startGame = () => {
    setScore(0);
    setHits(0);
    setMisses(0);
    setTimeLeft(30);
    setGameState('playing');
    setTimeout(spawnTarget, 50);
  };

  const handleHit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (gameState !== 'playing') return;
    setScore((s) => s + 100);
    setHits((h) => h + 1);
    spawnTarget();
  };

  const handleMiss = () => {
    if (gameState !== 'playing') return;
    setMisses((m) => m + 1);
    setScore((s) => Math.max(0, s - 20));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const precision = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Gentralha Aim</h1>
          </div>
          <div className="flex gap-4 items-center">
            {session ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
                  <Trophy className="w-4 h-4" /> Ranking
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-destructive transition-colors">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </>
            ) : (
              <Link to="/auth" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
                <User className="w-4 h-4" /> Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 gap-6">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black text-foreground">Treinador de Mira</h2>
          <p className="text-muted-foreground">Aperfeiçoe sua precisão e velocidade</p>
        </div>

        {/* Placar de Estatísticas */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-4xl">
          <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Tempo Restante</p>
              <p className="text-2xl font-mono font-bold text-foreground">{timeLeft}s</p>
            </div>
          </div>
          
          <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Pontuação</p>
              <p className="text-2xl font-mono font-bold text-foreground">{score}</p>
            </div>
          </div>

          <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Precisão Geral</p>
              <p className="text-2xl font-mono font-bold text-foreground">{precision}%</p>
            </div>
          </div>
        </div>

        {/* Área Interativa de Jogo */}
        <div 
          ref={containerRef}
          onClick={handleMiss}
          className="relative w-full max-w-4xl h-[500px] sm:h-[600px] bg-zinc-950 border-2 border-border rounded-xl overflow-hidden cursor-crosshair shadow-2xl select-none"
        >
          {gameState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10">
              <Target className="w-20 h-20 text-primary mb-6 animate-pulse" />
              <h3 className="text-3xl font-bold text-foreground mb-3">Modo Clássico</h3>
              <p className="text-muted-foreground mb-8 text-center max-w-md text-lg">
                Destrua o máximo de alvos possíveis em 30 segundos.<br/>
                Mas cuidado: tiros ao vazio dão punição de pontos.
              </p>
              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-10 py-4 text-lg bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 transition-transform active:scale-95 shadow-md"
              >
                Iniciar Treino
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <div 
              onClick={handleHit}
              className="absolute bg-destructive rounded-full shadow-[0_0_15px_rgba(239,68,68,0.7)] cursor-crosshair active:scale-90 transition-transform"
              style={{
                top: targetPos.y + 'px',
                left: targetPos.x + 'px',
                width: '48px',
                height: '48px',
              }}
            />
          )}

          {gameState === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-10">
              <div className="text-center mb-8">
                <h3 className="text-4xl font-black text-foreground mb-3">Treino Concluído!</h3>
                <p className="text-muted-foreground text-lg">Sua pontuação final foi de</p>
                <p className="text-6xl font-mono font-bold text-primary mt-4">{score}</p>
              </div>
              
              <div className="flex gap-12 mb-10 text-center">
                <div>
                  <p className="text-muted-foreground text-sm uppercase mb-1">Acertos</p>
                  <p className="text-3xl font-bold text-foreground">{hits}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm uppercase mb-1">Erros</p>
                  <p className="text-3xl font-bold text-foreground">{misses}</p>
                </div>
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="px-8 py-3 bg-secondary text-secondary-foreground font-bold rounded-full hover:bg-secondary/80 transition-transform active:scale-95 flex items-center gap-2 border border-border"
              >
                <Activity className="w-5 h-5"/> Jogar Novamente
              </button>
            </div>
          )}
        </div>
        
        {!session && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 px-4 py-2 rounded-full">
            <HelpCircle className="w-4 h-4" />
            <p>É necessário estar autenticado para registrar seu desempenho no ranking global.</p>
          </div>
        )}
      </main>
    </div>
  );
}
