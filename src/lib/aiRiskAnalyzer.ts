import { supabase } from './supabase';

/**
 * Chama a Edge Function 'risk-ai' do Supabase com um prompt + inputs.
 * Retorna o texto puro retornado pelo modelo.
 */
async function callAI(promptId: string, inputs: Record<string, string>): Promise<string> {
  const { data, error } = await supabase.functions.invoke('risk-ai', {
    body: { promptId, inputs },
  });
  if (error) throw new Error(error.message || 'Falha ao chamar IA');
  if (!data?.text) throw new Error(data?.error || 'IA retornou resposta vazia');
  return String(data.text).trim();
}

/**
 * Gera o descritivo de função (atribuições) de um cargo.
 * Usa o prompt 'descritivo-cargo' configurado em ai_config.
 */
export async function generateCargoDescription(input: {
  cargoNome: string;
  setor?: string;
  empresa?: string;
}): Promise<string> {
  const inputs: Record<string, string> = { Cargo: input.cargoNome };
  if (input.setor) inputs.Setor = input.setor;
  if (input.empresa) inputs.Empresa = input.empresa;
  return callAI('descritivo-cargo', inputs);
}

/**
 * Gera a fonte geradora de um risco para um cargo.
 * Usa o prompt 'fonte-geradora' configurado em ai_config.
 */
export async function generateFonteGeradora(input: {
  cargoNome: string;
  cargoAtribuicoes: string;
  riscoNome: string;
  riscoCategoria?: string;
}): Promise<string> {
  const inputs: Record<string, string> = {
    Cargo: input.cargoNome,
    'Atribuições do cargo': input.cargoAtribuicoes,
    'Risco identificado': input.riscoNome,
  };
  if (input.riscoCategoria) inputs['Categoria do risco'] = input.riscoCategoria;
  return callAI('fonte-geradora', inputs);
}
