import * as React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Target, Clock, Activity, Crosshair, HelpCircle, Trophy, User, LogOut, Settings, Volume2, VolumeX, Save, X } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: AimTrainer,
});

type AimSettings = {
  mira: {
    cor: string;
    tamanho: number;
  };
  som: boolean;
  sensibilidade: number;
};

const defaultSettings: AimSettings = {
  mira: {
    cor: '#ef4444',
    tamanho: 48,
  },
  som: true,
  sensibilidade: 1,
};

function AimTrainer() {
  const [gameState, setGameState] = React.useState<'idle' | 'playing' | 'finished'>('idle');
  const [score, setScore] = React.useState(0);
  const [hits, setHits] = React.useState(0);
  const [misses, setMisses] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState(30);
  const [targetPos, setTargetPos] = React.useState({ x: 50, y: 50 });
  const [session, setSession] = React.useState<any>(null);
  const [settings, setSettings] = React.useState<AimSettings>(defaultSettings);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsLoading, setSettingsLoading] = React.useState(false);
  const [settingsMessage, setSettingsMessage] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    const loadSettings = async () => {
      if (!session?.user?.id) {
        setSettings(defaultSettings);
        return;
      }

      const { data, error } = await supabase
        .from('aim_configuracoes')
        .select('mira, som, sensibilidade')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar configurações:', error.message);
        return;
      }

      if (data) {
        const mira = data.mira && typeof data.mira === 'object' ? data.mira as Record<string, unknown> : {};
        setSettings({
          mira: {
            cor: typeof mira.cor === 'string' ? mira.cor : defaultSettings.mira.cor,
            tamanho: typeof mira.tamanho === 'number' ? mira.tamanho : defaultSettings.mira.tamanho,
          },
          som: data.som,
          sensibilidade: Number(data.sensibilidade) || defaultSettings.sensibilidade,
        });
      }
    };

    loadSettings();
  }, [session]);

  const spawnTarget = React.useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const targetSize = settings.mira.tamanho;
    const maxX = Math.max(0, w - targetSize);
    const maxY = Math.max(0, h - targetSize);

    setTargetPos({
      x: Math.max(0, Math.random() * maxX),
      y: Math.max(0, Math.random() * maxY),
    });
  }, [settings.mira.tamanho]);

  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((previous) => previous - 1);
      }, 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      setGameState('finished');
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState, timeLeft]);

  React.useEffect(() => {
    if (gameState === 'finished') {
      saveSession(hits, misses, score);
    }
  }, [gameState, hits, misses, score]);

  const saveSession = async (finalHits: number, finalMisses: number, finalScore: number) => {
    if (!session?.user?.id) return;

    const total = finalHits + finalMisses;
    const precision = total > 0 ? Number(((finalHits / total) * 100).toFixed(2)) : 0;

    const { error } = await supabase.from('aim_sessoes').insert({
      perfil_id: session.user.id,
      modo: 'classico',
      duracao: 30,
      pontuacao: finalScore,
      acertos: finalHits,
      erros: finalMisses,
      precisao: precision,
      inicio: null,
      fim: new Date().toISOString(),
    });

    if (error) console.error('Erro ao salvar a sessão:', error.message);
  };

  const startGame = () => {
    setScore(0);
    setHits(0);
    setMisses(0);
    setTimeLeft(30);
    setGameState('playing');
    window.setTimeout(spawnTarget, 50);
  };

  const handleHit = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (gameState !== 'playing') return;
    setScore((current) => current + Math.round(100 * settings.sensibilidade));
    setHits((current) => current + 1);
    spawnTarget();
  };

  const handleMiss = () => {
    if (gameState !== 'playing') return;
    setMisses((current) => current + 1);
    setScore((current) => Math.max(0, current - 20));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const saveSettings = async () => {
    if (!session?.user?.id) {
      setSettingsMessage('Entre na sua conta para salvar as configurações.');
      return;
    }

    setSettingsLoading(true);
    setSettingsMessage('');

    const { error } = await supabase.from('aim_configuracoes').upsert({
      id: session.user.id,
      mira: settings.mira,
      som: settings.som,
      sensibilidade: settings.sensibilidade,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'id' });

    setSettingsLoading(false);
    setSettingsMessage(error ? 'Não foi possível salvar as configurações.' : 'Configurações salvas com sucesso.');
  };

  const precision = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Crosshair className="w-8 h-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Gentralha Aim</h1>
          </div>
          <nav className="flex gap-2 sm:gap-4 items-center">
            {session ? (
              <>
                <button onClick={() => { setSettingsOpen(true); setSettingsMessage(''); }} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
                  <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Configurações</span>
                </button>
                <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
                  <Trophy className="w-4 h-4" /> <span className="hidden sm:inline">Ranking</span>
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-destructive transition-colors">
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <Link to="/auth" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
                <User className="w-4 h-4" /> Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 sm:p-6 gap-6">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black text-foreground">Treinador de Mira</h2>
          <p className="text-muted-foreground">Aperfeiçoe sua precisão e velocidade</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
          <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-primary/10 rounded-lg text-primary"><Clock className="w-6 h-6" /></div>
            <div><p className="text-xs font-semibold text-muted-foreground uppercase">Tempo Restante</p><p className="text-2xl font-mono font-bold text-foreground">{timeLeft}s</p></div>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg"><Target className="w-6 h-6" /></div>
            <div><p className="text-xs font-semibold text-muted-foreground uppercase">Pontuação</p><p className="text-2xl font-mono font-bold text-foreground">{score}</p></div>
          </div>
          <div className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-lg"><Activity className="w-6 h-6" /></div>
            <div><p className="text-xs font-semibold text-muted-foreground uppercase">Precisão Geral</p><p className="text-2xl font-mono font-bold text-foreground">{precision}%</p></div>
          </div>
        </div>

        <div ref={containerRef} onClick={handleMiss} className="relative w-full max-w-4xl h-[500px] sm:h-[600px] bg-zinc-950 border-2 border-border rounded-xl overflow-hidden cursor-crosshair shadow-2xl select-none">
          {gameState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10 px-6">
              <Target className="w-20 h-20 text-primary mb-6 animate-pulse" />
              <h3 className="text-3xl font-bold text-foreground mb-3">Modo Clássico</h3>
              <p className="text-muted-foreground mb-8 text-center max-w-md text-lg">Destrua o máximo de alvos possíveis em 30 segundos.<br />Mas cuidado: tiros ao vazio dão punição de pontos.</p>
              <button onClick={(event) => { event.stopPropagation(); startGame(); }} className="px-10 py-4 text-lg bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 transition-transform active:scale-95 shadow-md">Iniciar Treino</button>
            </div>
          )}

          {gameState === 'playing' && (
            <div onClick={handleHit} className="absolute rounded-full cursor-crosshair active:scale-90 transition-transform" style={{ top: `${targetPos.y}px`, left: `${targetPos.x}px`, width: `${settings.mira.tamanho}px`, height: `${settings.mira.tamanho}px`, backgroundColor: settings.mira.cor, boxShadow: `0 0 15px ${settings.mira.cor}` }} />
          )}

          {gameState === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-10 px-6">
              <div className="text-center mb-8"><h3 className="text-4xl font-black text-foreground mb-3">Treino Concluído!</h3><p className="text-muted-foreground text-lg">Sua pontuação final foi de</p><p className="text-6xl font-mono font-bold text-primary mt-4">{score}</p></div>
              <div className="flex gap-12 mb-10 text-center"><div><p className="text-muted-foreground text-sm uppercase mb-1">Acertos</p><p className="text-3xl font-bold text-foreground">{hits}</p></div><div><p className="text-muted-foreground text-sm uppercase mb-1">Erros</p><p className="text-3xl font-bold text-foreground">{misses}</p></div></div>
              <button onClick={(event) => { event.stopPropagation(); startGame(); }} className="px-8 py-3 bg-secondary text-secondary-foreground font-bold rounded-full hover:bg-secondary/80 transition-transform active:scale-95 flex items-center gap-2 border border-border"><Activity className="w-5 h-5" /> Jogar Novamente</button>
            </div>
          )}
        </div>

        {!session && <div className="flex items-center gap-2 text-muted-foreground text-sm bg-muted/50 px-4 py-2 rounded-full"><HelpCircle className="w-4 h-4" /><p>É necessário estar autenticado para registrar seu desempenho no ranking global.</p></div>}
      </main>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-6"><div><h2 className="text-xl font-bold text-foreground">Configurações do treino</h2><p className="text-sm text-muted-foreground mt-1">Personalize sua experiência de mira.</p></div><button onClick={() => setSettingsOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="w-5 h-5" /></button></div>
            <div className="space-y-6 p-6">
              <div className="space-y-2"><label className="text-sm font-semibold text-foreground">Cor do alvo</label><div className="flex items-center gap-3"><input type="color" value={settings.mira.cor} onChange={(event) => setSettings((current) => ({ ...current, mira: { ...current.mira, cor: event.target.value } }))} className="h-11 w-16 cursor-pointer rounded-lg border border-input bg-background p-1" /><span className="font-mono text-sm text-muted-foreground">{settings.mira.cor}</span></div></div>
              <div className="space-y-2"><div className="flex justify-between"><label className="text-sm font-semibold text-foreground">Tamanho do alvo</label><span className="text-sm text-muted-foreground">{settings.mira.tamanho}px</span></div><input type="range" min="32" max="72" step="4" value={settings.mira.tamanho} onChange={(event) => setSettings((current) => ({ ...current, mira: { ...current.mira, tamanho: Number(event.target.value) } }))} className="w-full accent-primary" /></div>
              <div className="space-y-2"><div className="flex justify-between"><label className="text-sm font-semibold text-foreground">Sensibilidade da pontuação</label><span className="text-sm text-muted-foreground">{settings.sensibilidade.toFixed(1)}x</span></div><input type="range" min="0.5" max="2" step="0.1" value={settings.sensibilidade} onChange={(event) => setSettings((current) => ({ ...current, sensibilidade: Number(event.target.value) }))} className="w-full accent-primary" /></div>
              <button onClick={() => setSettings((current) => ({ ...current, som: !current.som }))} className="flex w-full items-center justify-between rounded-lg border border-border bg-background p-4 text-left hover:bg-muted transition-colors"><span><span className="block text-sm font-semibold text-foreground">Efeitos sonoros</span><span className="block text-xs text-muted-foreground mt-1">Preferência salva para o seu perfil</span></span>{settings.som ? <Volume2 className="w-5 h-5 text-primary" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}</button>
              {settingsMessage && <p className="text-sm text-muted-foreground">{settingsMessage}</p>}
              <button onClick={saveSettings} disabled={settingsLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Save className="w-4 h-4" />{settingsLoading ? 'Salvando...' : 'Salvar configurações'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
