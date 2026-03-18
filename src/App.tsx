import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Shield, 
  FileText, 
  Users, 
  Plus, 
  LogOut, 
  Search, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2,
  Camera,
  UserPlus,
  ChevronRight
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface User {
  id: string;
  username: string;
  avatar: string;
  isOfficer: boolean;
  isAdmin: boolean;
  gameId?: number;
  name: string;
}

interface Officer {
  game_id: number;
  name: string;
  discord_id: string;
}

interface RSO {
  id: string;
  created_by_id: number;
  vehicle_prefix: string;
  start_time: string;
  partners: number[];
  occurrence_details: any;
  status: string;
  officers?: { name: string };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"landing" | "dashboard" | "create-rso">("landing");
  const [rsos, setRsos] = useState<RSO[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data) {
        setUser(data);
        setView("dashboard");
        fetchRsos();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRsos = async () => {
    const res = await fetch("/api/rsos");
    const data = await res.json();
    setRsos(data);
  };

  const handleLogin = async () => {
    try {
      const origin = window.location.origin;
      const res = await fetch(`/api/auth/url?origin=${encodeURIComponent(origin)}`);
      if (!res.ok) throw new Error("Falha ao obter URL de autenticação");
      
      const { url } = await res.json();
      const width = 600, height = 800;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(url, "discord_auth", `width=${width},height=${height},left=${left},top=${top}`);
      
      if (!popup) {
        alert("Por favor, habilite popups para este site para se autenticar.");
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        // Validar origem
        if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) {
          return;
        }
        
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          checkAuth();
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Ocorreu um erro ao tentar iniciar o login com Discord.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setView("landing");
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-zinc-500">Carregando...</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 selection:bg-indigo-500/30 font-sans">
      <AnimatePresence mode="wait">
        {view === "landing" && <LandingPage onLogin={handleLogin} />}
        {view === "dashboard" && user && (
          <Dashboard 
            user={user} 
            rsos={rsos} 
            onLogout={handleLogout} 
            onCreateClick={() => setView("create-rso")} 
          />
        )}
        {view === "create-rso" && user && (
          <RSOCreateForm 
            user={user} 
            onBack={() => setView("dashboard")} 
            onSuccess={() => {
              fetchRsos();
              setView("dashboard");
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LandingPage({ onLogin }: { onLogin: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden"
    >
      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] bg-indigo-900/10 blur-[150px] rounded-full" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
      </div>

      <div className="relative z-10 max-w-4xl">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <div className="h-12 w-px bg-white/10" />
          <h2 className="text-2xl font-bold tracking-tighter text-zinc-400 uppercase">Itaim Paulista</h2>
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-black tracking-tighter mb-6 uppercase italic leading-none"
        >
          Sistema de <span className="text-indigo-500">RSO</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-12"
        >
          Plataforma oficial de registros operacionais da Polícia Militar de Itaim Paulista. 
          Acesso restrito a membros autorizados.
        </motion.p>

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogin}
          className="group relative px-12 py-5 bg-white text-black font-bold text-lg rounded-full overflow-hidden transition-all mb-4"
        >
          <span className="relative z-10 flex items-center gap-3">
            Acessar com Discord
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
          <div className="absolute inset-0 bg-indigo-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-zinc-500 text-xs"
        >
          Problemas ao logar? <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Abra o sistema em uma nova aba</a>
        </motion.div>
      </div>

      <footer className="absolute bottom-8 text-zinc-600 text-xs font-mono uppercase tracking-widest">
        © 2026 Itaim Paulista Security Division
      </footer>
    </motion.div>
  );
}

function Dashboard({ user, rsos, onLogout, onCreateClick }: { user: User, rsos: RSO[], onLogout: () => void, onCreateClick: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-6 py-12"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
        <div className="flex items-center gap-6">
          <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} className="w-20 h-20 rounded-3xl border-2 border-white/5" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{user.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">ID: {user.gameId || "N/A"}</span>
              <span className={cn(
                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
                user.isAdmin ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
              )}>
                {user.isAdmin ? "Administrador" : "Policial"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onCreateClick}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-indigo-600/20"
          >
            <Plus className="w-5 h-5" />
            CRIAR RSO
          </button>
          <button 
            onClick={onLogout}
            className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all text-zinc-400"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
            <FileText className="w-6 h-6 text-indigo-500" />
            Últimos Registros
          </h3>
          
          <div className="space-y-4">
            {rsos.map(rso => (
              <div key={rso.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-white/10 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-lg font-bold text-zinc-200">{rso.vehicle_prefix}</span>
                      <span className="text-xs font-mono text-zinc-500">• {new Date(rso.start_time).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-zinc-400">Registrado por: <span className="text-zinc-200">{rso.officers?.name || rso.created_by_id}</span></p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold uppercase">
                    {rso.status}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {rso.partners.length} Parceiros
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {Object.keys(rso.occurrence_details?.items || {}).length} Apreensões
                  </div>
                </div>
              </div>
            ))}
            {rsos.length === 0 && (
              <div className="p-20 text-center text-zinc-600 italic border-2 border-dashed border-white/5 rounded-3xl">
                Nenhum RSO registrado no sistema.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-3xl">
            <h4 className="font-bold text-indigo-400 mb-4 uppercase tracking-widest text-xs">Avisos do Comando</h4>
            <ul className="space-y-4 text-sm text-zinc-400">
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                Mantenha-se sempre em call durante o patrulhamento.
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                O preenchimento do RSO é obrigatório ao iniciar serviço.
              </li>
            </ul>
          </div>

          <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
            <h4 className="font-bold text-zinc-500 mb-6 uppercase tracking-widest text-xs">Status do Sistema</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Banco de Dados</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Bot Discord</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Sincronização</span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RSOCreateForm({ user, onBack, onSuccess }: { user: User, onBack: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    vehicle_prefix: "",
    start_time: new Date().toISOString().slice(0, 16),
    partners: [] as number[],
    details: {
      occurrence: "",
      items: [] as { name: string, qty: number }[],
      involved: [] as { name: string, rg: string }[]
    }
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Officer[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<Officer[]>([]);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const timer = setTimeout(async () => {
        const res = await fetch(`/api/officers/search?q=${searchQuery}`);
        const data = await res.json();
        setSearchResults(data);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const addPartner = (officer: Officer) => {
    if (!selectedPartners.find(p => p.game_id === officer.game_id)) {
      setSelectedPartners([...selectedPartners, officer]);
      setFormData({ ...formData, partners: [...formData.partners, officer.game_id] });
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const removePartner = (id: number) => {
    setSelectedPartners(selectedPartners.filter(p => p.game_id !== id));
    setFormData({ ...formData, partners: formData.partners.filter(p => p !== id) });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/rsos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) onSuccess();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-3xl mx-auto px-6 py-12"
    >
      <button onClick={onBack} className="text-zinc-500 hover:text-white mb-8 flex items-center gap-2 transition-colors">
        <ChevronRight className="w-4 h-4 rotate-180" />
        Voltar ao Dashboard
      </button>

      <div className="bg-white/[0.02] border border-white/5 rounded-[40px] p-8 md:p-12">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-12">Novo <span className="text-indigo-500">RSO</span></h2>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Prefixo da Viatura</label>
              <input 
                required
                placeholder="Ex: T-01"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500/50 transition-all"
                value={formData.vehicle_prefix}
                onChange={e => setFormData({ ...formData, vehicle_prefix: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Início da Patrulha</label>
              <input 
                type="datetime-local"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500/50 transition-all"
                value={formData.start_time}
                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Companheiros de VTR</label>
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                placeholder="Buscar por ID ou Nome..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-16 pr-6 py-4 outline-none focus:border-indigo-500/50 transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute z-50 top-full left-0 w-full mt-2 bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                  >
                    {searchResults.map(officer => (
                      <button 
                        key={officer.game_id}
                        type="button"
                        onClick={() => addPartner(officer)}
                        className="w-full px-6 py-4 text-left hover:bg-white/5 flex items-center justify-between group"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-200">{officer.name}</span>
                          <span className="text-xs text-zinc-500">ID: {officer.game_id}</span>
                        </div>
                        <Plus className="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedPartners.map(p => (
                <div key={p.game_id} className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm">
                  <span className="font-bold text-indigo-400">{p.game_id}</span>
                  <span className="text-zinc-300">{p.name}</span>
                  <button type="button" onClick={() => removePartner(p.game_id)} className="text-zinc-500 hover:text-red-400 ml-2">×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">Relatório da Ocorrência</label>
            <textarea 
              rows={4}
              placeholder="Descreva as atividades, apreensões e envolvidos..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-indigo-500/50 transition-all resize-none"
              value={formData.details.occurrence}
              onChange={e => setFormData({ ...formData, details: { ...formData.details, occurrence: e.target.value } })}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-6 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-500 hover:text-white transition-all shadow-2xl shadow-indigo-500/10"
          >
            Finalizar e Enviar RSO
          </button>
        </form>
      </div>
    </motion.div>
  );
}


