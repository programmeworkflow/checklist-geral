// @ts-nocheck — Deno runtime
/**
 * Edge Function risk-ai (genérica)
 *
 * Recebe { promptId: string, inputs: Record<string,string> }
 * - promptId: id de um registro em ai_config (ex: 'fonte-geradora', 'descritivo-cargo')
 * - inputs: pares chave→valor que viram o user message no formato "Chave: valor"
 *
 * Lê system_prompt e model da tabela ai_config[promptId].
 * Chama Anthropic Claude API.
 * Retorna { text: string } com o texto puro da resposta.
 *
 * Necessita secret: ANTHROPIC_API_KEY (e SUPABASE_URL/SERVICE_ROLE_KEY auto-injetadas).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function loadConfig(promptId: string): Promise<{ prompt: string; model: string } | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/ai_config?id=eq.${encodeURIComponent(promptId)}&select=system_prompt,model`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    if (!rows.length) return null;
    return {
      prompt: rows[0].system_prompt || "",
      model: rows[0].model || "claude-haiku-4-5-20251001",
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const body = await req.json();
    const promptId: string = body?.promptId;
    const inputs: Record<string, string> = body?.inputs || {};

    if (!promptId) {
      return Response.json({ error: "Falta promptId" }, { status: 400, headers: CORS });
    }
    if (!Object.keys(inputs).length) {
      return Response.json({ error: "Faltam inputs" }, { status: 400, headers: CORS });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500, headers: CORS });
    }

    const cfg = await loadConfig(promptId);
    if (!cfg) {
      return Response.json(
        { error: `Prompt '${promptId}' não encontrado em ai_config` },
        { status: 404, headers: CORS }
      );
    }

    // Monta user message a partir dos inputs
    const userMsg = Object.entries(inputs)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n\n");

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 1500,
        system: cfg.prompt,
        messages: [{ role: "user", content: userMsg }],
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      return Response.json(
        { error: `Anthropic ${aiResp.status}: ${t.slice(0, 400)}` },
        { status: 502, headers: CORS }
      );
    }

    const aiData = await aiResp.json();
    const text = aiData?.content?.[0]?.text?.trim() || "";

    return Response.json({ text }, { headers: CORS });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500, headers: CORS });
  }
});
