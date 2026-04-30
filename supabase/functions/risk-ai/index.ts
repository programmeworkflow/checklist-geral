// @ts-nocheck — Deno runtime
/**
 * Edge Function risk-ai (multi-provider, genérica)
 *
 * Recebe { promptId: string, inputs: Record<string,string> }
 * Lê system_prompt e model de ai_config[promptId]
 * Despacha para Anthropic Claude OU OpenAI GPT pelo prefixo do model:
 *   claude-* → Anthropic (https://api.anthropic.com)
 *   gpt-*    → OpenAI    (https://api.openai.com)
 *   o1*, o3* → OpenAI
 *
 * Secrets: ANTHROPIC_API_KEY e/ou OPENAI_API_KEY
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
    return { prompt: rows[0].system_prompt || "", model: rows[0].model || "claude-haiku-4-5-20251001" };
  } catch {
    return null;
  }
}

function detectProvider(model: string): "anthropic" | "openai" {
  const m = model.toLowerCase();
  if (m.startsWith("claude")) return "anthropic";
  if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3")) return "openai";
  // default fallback
  return "anthropic";
}

async function callAnthropic(model: string, system: string, userMsg: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Anthropic ${r.status}: ${t.slice(0, 400)}`);
  }
  const data = await r.json();
  return (data?.content?.[0]?.text || "").trim();
}

async function callOpenAI(model: string, system: string, userMsg: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  // o1/o3: não aceitam system message
  const isReasoning = /^o[13]/i.test(model);
  // GPT-5 family + reasoning models usam max_completion_tokens
  const usesCompletionTokens = isReasoning || /^gpt-5/i.test(model);

  const messages = isReasoning
    ? [{ role: "user", content: `${system}\n\n---\n\n${userMsg}` }]
    : [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ];

  const body: any = { model, messages };
  if (usesCompletionTokens) body.max_completion_tokens = 2000;
  else body.max_tokens = 1500;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenAI ${r.status}: ${t.slice(0, 400)}`);
  }
  const data = await r.json();
  return (data?.choices?.[0]?.message?.content || "").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  try {
    const body = await req.json();
    const promptId: string = body?.promptId;
    const inputs: Record<string, string> = body?.inputs || {};

    if (!promptId) return Response.json({ error: "Falta promptId" }, { status: 400, headers: CORS });
    if (!Object.keys(inputs).length) return Response.json({ error: "Faltam inputs" }, { status: 400, headers: CORS });

    const cfg = await loadConfig(promptId);
    if (!cfg) {
      return Response.json({ error: `Prompt '${promptId}' não encontrado em ai_config` }, { status: 404, headers: CORS });
    }

    const userMsg = Object.entries(inputs).map(([k, v]) => `${k}: ${v}`).join("\n\n");
    const provider = detectProvider(cfg.model);

    let text = "";
    try {
      text = provider === "openai"
        ? await callOpenAI(cfg.model, cfg.prompt, userMsg)
        : await callAnthropic(cfg.model, cfg.prompt, userMsg);
    } catch (err) {
      return Response.json({ error: String(err?.message || err) }, { status: 502, headers: CORS });
    }

    return Response.json({ text, provider, model: cfg.model }, { headers: CORS });
  } catch (err) {
    return Response.json({ error: String(err?.message || err) }, { status: 500, headers: CORS });
  }
});
