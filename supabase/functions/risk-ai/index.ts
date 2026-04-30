// @ts-nocheck — Deno runtime
/**
 * Edge Function risk-ai
 *
 * Recebe { cargoNome, cargoAtribuicoes, riscoNome, riscoCategoria? }
 * Chama Anthropic Claude API e retorna JSON com:
 *   { fonte, exposicao, severidade, probabilidade }
 *
 * Necessita secret: ANTHROPIC_API_KEY
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Você é um especialista em segurança do trabalho (NR-01) que analisa riscos ocupacionais.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

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
      return Response.json(
        { error: "ANTHROPIC_API_KEY não configurada nas secrets" },
        { status: 500, headers: CORS }
      );
    }

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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      return Response.json({ error: `Anthropic ${aiResp.status}: ${t.slice(0, 300)}` }, { status: 502, headers: CORS });
    }

    const aiData = await aiResp.json();
    const text = aiData?.content?.[0]?.text?.trim() || "";

    // Extrai o JSON da resposta (caso venha com markdown ou texto extra)
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

    // Valida e normaliza
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
