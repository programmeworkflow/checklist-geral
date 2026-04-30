// @ts-nocheck — Deno runtime
/**
 * Edge Function risk-ai
 *
 * Recebe { cargoNome, cargoAtribuicoes, riscoNome, riscoCategoria? }
 * Lê o system_prompt e o model da tabela ai_config (id='risk-ai')
 * Chama Anthropic Claude API e retorna JSON com:
 *   { fonte, exposicao, severidade, probabilidade }
 *
 * Necessita secret: ANTHROPIC_API_KEY
 * Necessita secret: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (auto-injetados)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FALLBACK_PROMPT = `Você é um especialista em segurança do trabalho (NR-01) que analisa riscos ocupacionais.

Dado um cargo, suas atribuições e um nome de risco identificado, sua tarefa é inferir 4 campos:

1. fonte (string): a FONTE GERADORA do risco — descrição CURTA (1-2 frases) explicando concretamente como/onde esse risco surge nas atividades do cargo.

2. exposicao (enum): "Contínua/Permanente" | "Intermitente" | "Habitual" | "Eventual/Ocasional" | "Outra".

3. severidade (string '1'-'5').

4. probabilidade (string '1'-'5').

Retorne APENAS JSON: {"fonte":"...","exposicao":"...","severidade":"X","probabilidade":"X"}`;

async function loadPrompt(): Promise<{ prompt: string; model: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return { prompt: FALLBACK_PROMPT, model: "claude-haiku-4-5-20251001" };
  }
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/ai_config?id=eq.risk-ai&select=system_prompt,model`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!r.ok) return { prompt: FALLBACK_PROMPT, model: "claude-haiku-4-5-20251001" };
    const rows = await r.json();
    if (!rows.length) return { prompt: FALLBACK_PROMPT, model: "claude-haiku-4-5-20251001" };
    return {
      prompt: rows[0].system_prompt || FALLBACK_PROMPT,
      model: rows[0].model || "claude-haiku-4-5-20251001",
    };
  } catch {
    return { prompt: FALLBACK_PROMPT, model: "claude-haiku-4-5-20251001" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const { cargoNome, cargoAtribuicoes, riscoNome, riscoCategoria } = await req.json();
    if (!cargoNome || !cargoAtribuicoes || !riscoNome) {
      return Response.json(
        { error: "Faltam campos: cargoNome, cargoAtribuicoes, riscoNome" },
        { status: 400, headers: CORS }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500, headers: CORS });
    }

    const { prompt, model } = await loadPrompt();

    const userMsg = [
      `Cargo: ${cargoNome}`,
      `Atribuições do cargo:\n${cargoAtribuicoes}`,
      `Risco identificado: ${riscoNome}${riscoCategoria ? ` (categoria: ${riscoCategoria})` : ""}`,
      `\nResponda no formato JSON especificado.`,
    ].join("\n\n");

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system: prompt,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      return Response.json({ error: `Anthropic ${aiResp.status}: ${t.slice(0, 300)}` }, { status: 502, headers: CORS });
    }

    const aiData = await aiResp.json();
    const text = aiData?.content?.[0]?.text?.trim() || "";

    const match = text.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : text;
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return Response.json(
        { error: "IA retornou formato inválido", raw: text.slice(0, 500) },
        { status: 502, headers: CORS }
      );
    }

    const VALID_EXPOSURES = ["Contínua/Permanente", "Intermitente", "Habitual", "Eventual/Ocasional", "Outra"];
    if (!VALID_EXPOSURES.includes(parsed.exposicao)) parsed.exposicao = "Habitual";
    parsed.severidade = String(parsed.severidade ?? "0");
    parsed.probabilidade = String(parsed.probabilidade ?? "0");
    if (!["0", "1", "2", "3", "4", "5"].includes(parsed.severidade)) parsed.severidade = "0";
    if (!["0", "1", "2", "3", "4", "5"].includes(parsed.probabilidade)) parsed.probabilidade = "0";
    parsed.fonte = String(parsed.fonte || "").trim();

    return Response.json(parsed, { headers: CORS });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500, headers: CORS });
  }
});
