import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UserCheck, Search, ArrowRight } from 'lucide-react';
import logoColorida from '@/assets/logo-colorida.png';

export default function Login() {
  const { professionals, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Já logado → manda pro dashboard
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const sorted = useMemo(
    () => [...professionals].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [professionals]
  );

  const filtered = useMemo(() => {
    if (!search) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.formation || '').toLowerCase().includes(q) ||
      (p.registration || '').toLowerCase().includes(q)
    );
  }, [sorted, search]);

  const handleSelect = (id: string) => {
    login(id);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white shadow-sm border border-border/60 p-3">
            <img src={logoColorida} alt="MedWork" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="eyebrow">MedWork</p>
            <h1 className="heading-display text-3xl text-foreground">VISTEC</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione seu perfil para iniciar
            </p>
          </div>
        </div>

        {/* Search */}
        {sorted.length > 4 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou formação..."
              className="pl-9 h-11"
            />
          </div>
        )}

        {/* Lista */}
        {sorted.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <UserCheck className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-semibold text-foreground">Nenhum profissional cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre profissionais antes de fazer login.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className="w-full text-left group"
              >
                <Card className="card-interactive p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{p.name}</p>
                    {(p.formation || p.registration) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {p.formation}
                        {p.formation && p.registration && ' · '}
                        {p.registration}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </Card>
              </button>
            ))}
            {filtered.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Nenhum perfil corresponde a "{search}".
              </Card>
            )}
          </div>
        )}

        <p className="text-[10px] text-center text-muted-foreground/70 uppercase tracking-wider">
          Sessão local · você pode trocar de perfil a qualquer momento
        </p>
      </div>
    </div>
  );
}
