import { supabase } from './supabase';

export interface AIRiskInput {
  cargoNome: string;
  cargoAtribuicoes: string;
  riscoNome: string;
  riscoCategoria?: string;
}

export interface AIRiskOutput {
  fonte: string;
  exposicao: 'Contínua/Permanente' | 'Intermitente' | 'Eventual/Ocasional' | 'Habitual' | 'Outra';
  severidade: '0' | '1' | '2' | '3' | '4' | '5';
  probabilidade: '0' | '1' | '2' | '3' | '4' | '5';
}

/**
 * Chama a Edge Function 'risk-ai' do Supabase, que internamente
 * usa um LLM (Claude/OpenAI) pra inferir os campos do risco baseado
 * no cargo + atribuições + nome do risco.
 *
 * A Edge Function precisa estar deployada com ANTHROPIC_API_KEY (ou
 * equivalente) configurada como secret.
 */
export async function generateRiskFieldsWithAI(input: AIRiskInput): Promise<AIRiskOutput> {
  const { data, error } = await supabase.functions.invoke('risk-ai', {
    body: input,
  });
  if (error) throw new Error(error.message || 'Falha ao chamar IA');
  if (!data || typeof data !== 'object') throw new Error('Resposta da IA inválida');
  if (!data.fonte || !data.exposicao || data.severidade == null || data.probabilidade == null) {
    throw new Error('Campos faltantes na resposta da IA');
  }
  return data as AIRiskOutput;
}
