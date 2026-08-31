import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_PASSWORD = "3010";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const url = new URL(req.url);
    const method = req.method;

    // GET /knowledge-numbers — return all 31 rows
    if (method === "GET") {
      const { data, error } = await supabase
        .from("knowledge_numbers")
        .select("number, content, updated_at")
        .order("number", { ascending: true });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PATCH /knowledge-numbers — update a specific number's content (admin only)
    if (method === "PATCH") {
      const body = await req.json();
      const { number, content, password } = body as {
        number: number;
        content: string;
        password: string;
      };

      if (password !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Неверный пароль" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (typeof number !== "number" || number < 1 || number > 31) {
        return new Response(JSON.stringify({ error: "Неверный номер" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("knowledge_numbers")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("number", number)
        .select("number, content, updated_at")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
