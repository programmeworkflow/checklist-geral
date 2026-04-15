import { HelpCircle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const SEVERITY_LEVELS = [
  { label: '1 – Leve', desc: 'Lesão leve sem necessidade de atenção médica, incômodos ou mal estar.' },
  { label: '2 – Baixa', desc: 'Lesão ou doenças sérias reversíveis.' },
  { label: '3 – Moderada', desc: 'Lesão ou doenças críticas irreversíveis que podem limitar a capacidade funcional.' },
  { label: '4 – Alta', desc: 'Lesão ou doença incapacitante ou mortal.' },
  { label: '5 – Extrema', desc: 'Mortes ou incapacidades múltiplas (>10).' },
];

const PROB_PHYSICAL = [
  { level: '1', col1: 'Exposição a níveis muito baixos', col2: 'Exposições < 10% LEO' },
  { level: '2', col1: 'Exposição baixa', col2: 'Exposições >10% e <50% LEO' },
  { level: '3', col1: 'Exposição moderada', col2: 'Exposições >50% e <100% LEO' },
  { level: '4', col1: 'Exposição excessiva', col2: 'Exposições >100% a 500% LEO' },
  { level: '5', col1: 'Exposição muito excessiva', col2: 'Exposições superiores a 5x LEO' },
];

const PROB_CHEMICAL = [
  { level: '1', col1: 'Sem possibilidade', col2: 'Sistema totalmente fechado' },
  { level: '2', col1: 'Baixa possibilidade', col2: 'Sistema fechado com pouca exposição' },
  { level: '3', col1: 'Pouca possibilidade', col2: 'Sistema semiaberto com ventilação' },
  { level: '4', col1: 'Média possibilidade', col2: 'Sistema aberto com ventilação passiva' },
  { level: '5', col1: 'Alta possibilidade', col2: 'Sistema aberto sem ventilação' },
];

const PROB_OTHER = [
  { level: '1', col1: 'Controle excelente', col2: 'Melhor prática disponível' },
  { level: '2', col1: 'Controle conforme legislação', col2: 'Adequado e mantido' },
  { level: '3', col1: 'Controle com pequenas falhas', col2: 'Deficiências leves' },
  { level: '4', col1: 'Controle deficiente', col2: 'Falhas relevantes' },
  { level: '5', col1: 'Controle inexistente', col2: 'Totalmente inadequado' },
];

export function SeverityHelp() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-primary transition-colors p-0.5">
          <HelpCircle className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Estimativa de Severidade | AIHA (2015)</DialogTitle>
          <DialogDescription className="sr-only">Definições dos níveis de severidade</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 font-semibold text-foreground">Nível</th>
                <th className="text-left py-2 font-semibold text-foreground">Definição</th>
              </tr>
            </thead>
            <tbody>
              {SEVERITY_LEVELS.map(l => (
                <tr key={l.label} className="border-b border-border/50">
                  <td className="py-2.5 pr-3 font-medium text-foreground whitespace-nowrap">{l.label}</td>
                  <td className="py-2.5 text-muted-foreground">{l.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-4 italic">
            Obs: Esta é uma sugestão para auxiliar na escolha do nível de severidade, ficando sob responsabilidade do profissional habilitado a correta gradação.
          </p>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface ProbabilityHelpProps {
  riskCategoryType?: string;
}

export function ProbabilityHelp({ riskCategoryType }: ProbabilityHelpProps) {
  const isChemical = riskCategoryType === 'chemical';
  const isPhysical = riskCategoryType === 'physical';
  const data = isChemical ? PROB_CHEMICAL : isPhysical ? PROB_PHYSICAL : PROB_OTHER;
  const title = isChemical
    ? 'Estimativa de Probabilidade: Substâncias Químicas'
    : isPhysical
    ? 'Estimativa de Probabilidade baseada no LEO (Limite de Exposição Ocupacional) | AIHA (2015)'
    : 'Estimativa de Probabilidade: Controle Existente x Medidas Preventivas';
  const col1Header = isChemical ? 'Inalação/Contato' : isPhysical ? 'Categoria' : 'Categoria';
  const col2Header = isChemical ? 'Condição' : isPhysical ? 'Critério' : 'Definição';
  const note = isChemical
    ? 'Sistema refere-se à fonte geradora da substância química.'
    : isPhysical
    ? 'Não considerar EPI na avaliação.'
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-primary transition-colors p-0.5">
          <HelpCircle className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{title}</DialogTitle>
          <DialogDescription className="sr-only">Definições dos níveis de probabilidade</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-2 font-semibold text-foreground w-12">Nível</th>
                <th className="text-left py-2 pr-2 font-semibold text-foreground">{col1Header}</th>
                <th className="text-left py-2 font-semibold text-foreground">{col2Header}</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.level} className="border-b border-border/50">
                  <td className="py-2.5 pr-2 font-medium text-foreground text-center">{row.level}</td>
                  <td className="py-2.5 pr-2 text-foreground">{row.col1}</td>
                  <td className="py-2.5 text-muted-foreground">{row.col2}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {note && (
            <p className="text-xs text-muted-foreground mt-4 italic">
              Nota: {note}
            </p>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export const SEVERITY_OPTIONS = [
  { value: '0', label: 'Não informado' },
  { value: '1', label: 'Leve (1)' },
  { value: '2', label: 'Baixa (2)' },
  { value: '3', label: 'Moderada (3)' },
  { value: '4', label: 'Alta (4)' },
  { value: '5', label: 'Extrema (5)' },
];

export const PROBABILITY_OPTIONS = [
  { value: '0', label: 'Não informado' },
  { value: '1', label: 'Raro (1)' },
  { value: '2', label: 'Pouco provável (2)' },
  { value: '3', label: 'Possível (3)' },
  { value: '4', label: 'Provável (4)' },
  { value: '5', label: 'Muito provável (5)' },
];
