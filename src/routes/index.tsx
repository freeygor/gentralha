import * as React from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { Target, Clock, Activity, HelpCircle, Trophy, User, LogOut, Settings, Volume2, VolumeX, Save, X } from 'lucide-react';

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
    cor: '#22c55e', // Verde neon padrão do tema
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
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans relative overflow-hidden">
      {/* Fundo temático geral */}
      <div 
        className="absolute inset-0 z-0 opacity-15 pointer-events-none"
        style={{ 
          backgroundImage: 'url("/uploads/gen_banner_smoke.png")', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundAttachment: 'fixed',
          filter: 'blur(2px)'
        }} 
      />

      <header className="relative z-10 border-b border-green-900/40 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-green-500/30 shadow-[0_0_10px_rgba(34,197,94,0.3)] bg-black">
              <img src="/uploads/gen_logo_smoke.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-md">
              Gentralha <span className="text-green-500">Aim</span>
            </h1>
          </div>
          <nav className="flex gap-2 sm:gap-4 items-center">
            {session ? (
              <>
                <button onClick={() => { setSettingsOpen(true); setSettingsMessage(''); }} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-400 hover:text-green-400 transition-colors">
                  <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Configurações</span>
                </button>
                <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-400 hover:text-green-400 transition-colors">
                  <Trophy className="w-4 h-4" /> <span className="hidden sm:inline">Ranking</span>
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-400 hover:text-red-400 transition-colors">
                  <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <Link to="/auth" className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-500 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] flex items-center gap-2">
                <User className="w-4 h-4" /> Entrar
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center p-4 sm:p-6 gap-6">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black text-white drop-shadow-lg uppercase tracking-wider">
            Treinador <span className="text-green-500">de Mira</span>
          </h2>
          <p className="text-green-400/80 font-medium">Aperfeiçoe sua precisão e velocidade</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-4xl">
          <div className="bg-zinc-900/80 backdrop-blur border border-green-900/30 p-4 rounded-xl flex items-center gap-4 shadow-lg">
            <div className="p-3 bg-zinc-800 rounded-lg text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]"><Clock className="w-6 h-6" /></div>
            <div><p className="text-xs font-semibold text-zinc-500 uppercase">Tempo Restante</p><p className="text-2xl font-mono font-bold text-white">{timeLeft}s</p></div>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur border border-green-900/30 p-4 rounded-xl flex items-center gap-4 shadow-lg">
            <div className="p-3 bg-zinc-800 rounded-lg text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]"><Target className="w-6 h-6" /></div>
            <div><p className="text-xs font-semibold text-zinc-500 uppercase">Pontuação</p><p className="text-2xl font-mono font-bold text-white">{score}</p></div>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur border border-green-900/30 p-4 rounded-xl flex items-center gap-4 shadow-lg">
            <div className="p-3 bg-zinc-800 rounded-lg text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]"><Activity className="w-6 h-6" /></div>
            <div><p className="text-xs font-semibold text-zinc-500 uppercase">Precisão Geral</p><p className="text-2xl font-mono font-bold text-white">{precision}%</p></div>
          </div>
        </div>

        <div 
          ref={containerRef} 
          onClick={handleMiss} 
          className="relative w-full max-w-4xl h-[500px] sm:h-[600px] bg-black/60 backdrop-blur-sm border-2 border-green-900/50 rounded-xl overflow-hidden cursor-crosshair shadow-[0_0_30px_rgba(34,197,94,0.1)] select-none"
        >
          {/* Overlay de espera ou fim repete o banner para um visual mais imersivo na área do jogo */}
          {(gameState === 'idle' || gameState === 'finished') && (
            <div 
              className="absolute inset-0 z-0 opacity-40" 
              style={{ backgroundImage: 'url("/uploads/gen_banner_smoke.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
          )}

          {gameState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10 px-6">
              <div className="w-24 h-24 mb-6 rounded-full overflow-hidden border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-pulse bg-black">
                 <img src="/uploads/gen_logo_smoke.png" alt="Gentralha" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-4xl font-black text-white mb-3 tracking-wide uppercase">Modo <span className="text-green-500">Clássico</span></h3>
              <p className="text-zinc-300 mb-8 text-center max-w-md text-lg">Destrua o máximo de alvos possíveis em 30 segundos. Tiros ao vazio dão punição.</p>
              <button onClick={(event) => { event.stopPropagation(); startGame(); }} className="px-10 py-4 text-lg bg-green-600 text-white font-black uppercase tracking-wider rounded-full hover:bg-green-500 transition-transform active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.6)]">
                Entrar na Névoa
              </button>
            </div>
          )}

          {gameState === 'playing' && (
            <div 
              onClick={handleHit} 
              className="absolute rounded-full cursor-crosshair active:scale-90 transition-transform"
              style={{ 
                top: `${targetPos.y}px`, 
                left: `${targetPos.x}px`, 
                width: `${settings.mira.tamanho}px`, 
                height: `${settings.mira.tamanho}px`, 
                backgroundColor: settings.mira.cor, 
                boxShadow: `0 0 20px ${settings.mira.cor}` 
              }} 
            />
          )}

          {gameState === 'finished' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md z-10 px-6">
              <div className="text-center mb-8">
                <h3 className="text-4xl font-black text-white mb-3 uppercase tracking-wider">Treino <span className="text-green-500">Concluído</span></h3>
                <p className="text-zinc-400 text-lg">Sua pontuação final foi de</p>
                <p className="text-7xl font-mono font-black text-green-500 mt-4 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">{score}</p>
              </div>
              <div className="flex gap-12 mb-10 text-center">
                <div><p className="text-zinc-500 text-sm uppercase mb-1 font-bold">Acertos</p><p className="text-3xl font-bold text-white">{hits}</p></div>
                <div><p className="text-zinc-500 text-sm uppercase mb-1 font-bold">Erros</p><p className="text-3xl font-bold text-white">{misses}</p></div>
              </div>
              <button onClick={(event) => { event.stopPropagation(); startGame(); }} className="px-8 py-3 bg-zinc-800 text-white font-bold uppercase tracking-wider rounded-full hover:bg-zinc-700 transition-transform active:scale-95 flex items-center gap-2 border border-green-500/50 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <Activity className="w-5 h-5 text-green-500" /> Tentar Novamente
              </button>
            </div>
          )}
        </div>

        {!session && (
          <div className="flex items-center gap-2 text-zinc-400 text-sm bg-zinc-900/80 border border-green-900/30 px-6 py-3 rounded-full shadow-lg">
            <HelpCircle className="w-4 h-4 text-green-500" />
            <p>É necessário estar autenticado para registrar seu desempenho no ranking global.</p>
          </div>
        )}
      </main>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl border border-green-900/50 bg-zinc-950 shadow-[0_0_40px_rgba(34,197,94,0.15)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-green-900/30 bg-zinc-900/50 p-6">
              <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Configurações</h2>
                <p className="text-sm text-green-400/80 mt-1">Personalize sua mira e sistema</p>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6 p-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Cor do alvo</label>
                <div className="flex items-center gap-4">
                  <input type="color" value={settings.mira.cor} onChange={(event) => setSettings((current) => ({ ...current, mira: { ...current.mira, cor: event.target.value } }))} className="h-12 w-20 cursor-pointer rounded-lg border-2 border-zinc-800 bg-zinc-900 p-1" />
                  <span className="font-mono text-sm text-green-400 bg-zinc-900 px-3 py-1 rounded-md border border-zinc-800">{settings.mira.cor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Tamanho do alvo</label>
                  <span className="text-sm font-mono text-green-400">{settings.mira.tamanho}px</span>
                </div>
                <input type="range" min="32" max="72" step="4" value={settings.mira.tamanho} onChange={(event) => setSettings((current) => ({ ...current, mira: { ...current.mira, tamanho: Number(event.target.value) } }))} className="w-full accent-green-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Sensibilidade / Risco</label>
                  <span className="text-sm font-mono text-green-400">{settings.sensibilidade.toFixed(1)}x</span>
                </div>
                <input type="range" min="0.5" max="2" step="0.1" value={settings.sensibilidade} onChange={(event) => setSettings((current) => ({ ...current, sensibilidade: Number(event.target.value) }))} className="w-full accent-green-500" />
              </div>
              <button onClick={() => setSettings((current) => ({ ...current, som: !current.som }))} className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-left hover:bg-zinc-800 transition-colors">
                <span>
                  <span className="block text-sm font-semibold text-white uppercase tracking-wide">Sistemas de som</span>
                  <span className="block text-xs text-zinc-500 mt-1">Efeitos ao disparar</span>
                </span>
                {settings.som ? <Volume2 className="w-5 h-5 text-green-500" /> : <VolumeX className="w-5 h-5 text-zinc-600" />}
              </button>
              {settingsMessage && <p className="text-sm text-green-400 italic bg-green-500/10 p-2 rounded border border-green-500/20">{settingsMessage}</p>}
              <button onClick={saveSettings} disabled={settingsLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-4 font-black uppercase tracking-wider text-white hover:bg-green-500 disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                <Save className="w-5 h-5" /> {settingsLoading ? 'Salvando...' : 'Gravar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
