import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { aiConfigStore } from '@/lib/storage';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Save, RotateCcw, Bot } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_PROMPT = `Você é um especialista em segurança do trabalho (NR-01) que analisa riscos ocupacionais.

Dado um cargo, suas atribuições e um nome de risco identificado, sua tarefa é inferir 4 campos:

1. fonte (string): a FONTE GERADORA do risco — descrição CURTA (1-2 frases, máx 200 chars) explicando concretamente como/onde esse risco surge nas atividades do cargo. Use linguagem técnica de SST.

2. exposicao (enum): tipo de exposição. Escolha EXATAMENTE uma destas opções:
   - "Contínua/Permanente" (cargo passa a maior parte do tempo exposto)
   - "Intermitente" (com intervalos regulares)
   - "Habitual" (frequente mas não permanente)
   - "Eventual/Ocasional" (raro, esporádico)
   - "Outra" (último recurso)

3. severidade (string '0'-'5'): gravidade do dano caso o risco ocorra.
   - "1" = Sem dano (irrelevante)
   - "2" = Baixa (lesões leves, primeiros socorros)
   - "3" = Moderada (afastamento curto)
   - "4" = Alta (lesão grave, afastamento longo, invalidez parcial)
   - "5" = Catastrófica (óbito, invalidez permanente)

4. probabilidade (string '0'-'5'): chance de ocorrência.
   - "1" = Muito improvável (raro, controles fortes)
   - "2" = Pouco provável
   - "3" = Provável
   - "4" = Muito provável (frequente)
   - "5" = Quase certo

Retorne APENAS um JSON válido no formato:
{"fonte":"...","exposicao":"...","severidade":"X","probabilidade":"X"}

Nada mais. Sem markdown, sem comentários.`;

const MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (rápido, barato)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (qualidade)' },
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7 (top, mais caro)' },
];

export default function PromptIA() {
  const qc = useQueryClient();
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['ai_config'],
    queryFn: () => aiConfigStore.getAll(),
  });

  const config = configs.find(c => c.id === 'risk-ai');

  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('claude-haiku-4-5-20251001');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setPrompt(config.systemPrompt || '');
      setModel(config.model || 'claude-haiku-4-5-20251001');
    }
  }, [config?.id]);

  const handleSave = async () => {
    if (!prompt.trim()) {
      toast.error('Prompt não pode ficar vazio');
      return;
    }
    setSaving(true);
    try {
      if (config) {
        await aiConfigStore.update('risk-ai', { systemPrompt: prompt, model } as any);
      } else {
        await aiConfigStore.add({ id: 'risk-ai', systemPrompt: prompt, model } as any);
      }
      qc.invalidateQueries({ queryKey: ['ai_config'] });
      toast.success('Prompt salvo. Próximas chamadas usam o novo prompt.');
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err?.message || 'desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Restaurar o prompt padrão? Suas mudanças serão perdidas.')) return;
    setPrompt(DEFAULT_PROMPT);
    setModel('claude-haiku-4-5-20251001');
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="pb-3 border-b border-border/60">
        <p className="eyebrow mb-1 inline-flex items-center gap-1.5"><Bot className="h-3 w-3" /> Inteligência Artificial</p>
        <h1 className="heading-display text-3xl md:text-4xl text-foreground">Prompt da IA</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl">
          Configure como a IA analisa cargos e gera os campos de risco (fonte geradora, exposição, severidade, probabilidade). O prompt abaixo é enviado como instrução de sistema.
        </p>
      </div>

      <Card className="p-5 space-y-4 bg-amber-50/50 border-amber-200">
        <div className="flex gap-3">
          <Sparkles className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">Como funciona</p>
            <p className="text-xs leading-relaxed">
              Quando você clica em <span className="font-semibold">"✨ Gerar com IA"</span> ao lado de um risco no checklist, o sistema envia: <strong>cargo selecionado + atribuições do cargo + nome do risco + categoria</strong>. A IA usa o prompt abaixo como instrução e responde em JSON com os 4 campos preenchidos.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div>
          <label className="text-sm font-semibold text-foreground block mb-2">Modelo</label>
          <select
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
            value={model}
            onChange={e => setModel(e.target.value)}
          >
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Haiku: ~US$0.0001/análise · Sonnet: ~US$0.003/análise · Opus: ~US$0.015/análise
          </p>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground block mb-2">
            System Prompt
            {prompt && <span className="ml-2 text-xs text-muted-foreground font-normal">{prompt.length} caracteres</span>}
          </label>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="Você é um especialista em segurança do trabalho..."
            rows={20}
            className="font-mono text-xs leading-relaxed"
          />
          <p className="text-xs text-muted-foreground mt-1">
            O prompt deve instruir a IA a retornar <strong>APENAS JSON válido</strong> com as 4 chaves:
            <code className="font-mono ml-1">fonte</code>, <code className="font-mono">exposicao</code>,
            <code className="font-mono ml-1">severidade</code>, <code className="font-mono">probabilidade</code>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving || isLoading} className="gap-1.5">
            <Save className="h-4 w-4" />
            {saving ? 'Salvando…' : 'Salvar prompt'}
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Restaurar padrão
          </Button>
        </div>
      </Card>

      {config?.updatedAt && (
        <p className="text-xs text-muted-foreground text-center">
          Última atualização: {new Date(config.updatedAt).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  );
}
