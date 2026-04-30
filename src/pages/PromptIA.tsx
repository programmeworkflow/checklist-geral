import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { aiConfigStore } from '@/lib/storage';
import type { AIConfig } from '@/lib/storage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Save, RotateCcw, Bot, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';
import { marked } from 'marked';

const MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (rápido, barato)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (qualidade)' },
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7 (top, mais caro)' },
];

const DEFAULT_RISK_AI = `Você é um especialista em segurança do trabalho (NR-01) que analisa riscos ocupacionais.

Dado um cargo, suas atribuições e um nome de risco identificado, sua tarefa é inferir 4 campos:

1. **fonte** (string): a FONTE GERADORA do risco — descrição CURTA (1-2 frases, máx 200 chars).

2. **exposicao** (enum): "Contínua/Permanente" | "Intermitente" | "Habitual" | "Eventual/Ocasional" | "Outra".

3. **severidade** (string '1'-'5').

4. **probabilidade** (string '1'-'5').

Retorne APENAS JSON: \`{"fonte":"...","exposicao":"...","severidade":"X","probabilidade":"X"}\``;

export default function PromptIA() {
  const qc = useQueryClient();
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['ai_config'],
    queryFn: () => aiConfigStore.getAll(),
  });

  // Garante ordem fixa: risk-ai primeiro, depois custom
  const sortedConfigs = [...configs].sort((a, b) => {
    if (a.id === 'risk-ai') return -1;
    if (b.id === 'risk-ai') return 1;
    return (a.name || a.id).localeCompare(b.name || b.id, 'pt-BR');
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="pb-3 border-b border-border/60">
        <p className="eyebrow mb-1 inline-flex items-center gap-1.5"><Bot className="h-3 w-3" /> Inteligência Artificial</p>
        <h1 className="heading-display text-3xl md:text-4xl text-foreground">Prompt da IA</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Configure os prompts que a IA usa em cada funcionalidade do sistema. Aceita <strong>Markdown</strong> — use <code className="font-mono text-xs">**negrito**</code>, listas, blocos de código etc. para organizar.
        </p>
      </div>

      {isLoading && (
        <Card className="p-6 text-center text-sm text-muted-foreground">Carregando…</Card>
      )}

      {sortedConfigs.map(cfg => (
        <PromptCard key={cfg.id} config={cfg} onSaved={() => qc.invalidateQueries({ queryKey: ['ai_config'] })} />
      ))}

      {!isLoading && sortedConfigs.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma configuração de IA encontrada. Recarregue a página.
        </Card>
      )}
    </div>
  );
}

function PromptCard({ config, onSaved }: { config: AIConfig; onSaved: () => void }) {
  const [name, setName] = useState(config.name || config.id);
  const [prompt, setPrompt] = useState(config.systemPrompt || '');
  const [model, setModel] = useState(config.model || 'claude-haiku-4-5-20251001');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(config.name || config.id);
    setPrompt(config.systemPrompt || '');
    setModel(config.model || 'claude-haiku-4-5-20251001');
  }, [config.id]);

  const handleSave = async () => {
    if (!prompt.trim()) {
      toast.error('Prompt não pode ficar vazio');
      return;
    }
    setSaving(true);
    try {
      await aiConfigStore.update(config.id, {
        name: name.trim() || config.id,
        systemPrompt: prompt,
        model,
      } as any);
      onSaved();
      toast.success(`"${name}" salvo`);
    } catch (err: any) {
      toast.error(`Erro: ${err?.message || 'desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config.id !== 'risk-ai') return;
    if (!confirm('Restaurar o prompt padrão? Suas mudanças serão perdidas.')) return;
    setPrompt(DEFAULT_RISK_AI);
    setModel('claude-haiku-4-5-20251001');
  };

  const isPrimary = config.id === 'risk-ai';

  // Renderiza markdown como HTML pra preview
  const previewHtml = marked.parse(prompt || '*(vazio)*', { breaks: true, async: false }) as string;

  return (
    <Card className="overflow-hidden">
      {/* Header do card */}
      <div className={`px-5 py-3 border-b ${isPrimary ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-border'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isPrimary ? (
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={isPrimary}
              className="bg-transparent outline-none text-sm font-bold text-foreground border-0 px-0 py-0 flex-1 min-w-0 disabled:cursor-not-allowed"
            />
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              id: {config.id}
            </span>
          </div>
        </div>
        {config.description && (
          <p className="text-xs text-muted-foreground mt-1.5">{config.description}</p>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Modelo */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Modelo</label>
          <select
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              System Prompt {prompt && <span className="ml-2 text-[10px] font-normal text-muted-foreground/70">{prompt.length} caracteres · markdown</span>}
            </label>
            <div className="inline-flex rounded-md border border-input overflow-hidden text-xs">
              <button
                onClick={() => setTab('edit')}
                className={`px-3 py-1.5 inline-flex items-center gap-1.5 ${tab === 'edit' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                <Code className="h-3 w-3" /> Editar
              </button>
              <button
                onClick={() => setTab('preview')}
                className={`px-3 py-1.5 inline-flex items-center gap-1.5 border-l border-input ${tab === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                <Eye className="h-3 w-3" /> Preview
              </button>
            </div>
          </div>

          {tab === 'edit' ? (
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Escreva o prompt em markdown..."
              rows={16}
              className="font-mono text-xs leading-relaxed"
            />
          ) : (
            <div
              className="prose prose-sm max-w-none border border-input rounded-md p-4 bg-muted/20 min-h-[400px] text-sm
                         prose-headings:font-bold prose-headings:text-foreground prose-headings:mt-4 prose-headings:mb-2
                         prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
                         prose-p:my-2 prose-li:my-0.5
                         prose-code:text-[11px] prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                         prose-strong:text-foreground"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
          {isPrimary && (
            <Button variant="outline" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-4 w-4" /> Restaurar padrão
            </Button>
          )}
        </div>

        {config.updatedAt && (
          <p className="text-[10px] text-muted-foreground/70 text-right">
            Atualizado em {new Date(config.updatedAt).toLocaleString('pt-BR')}
          </p>
        )}
      </div>
    </Card>
  );
}
