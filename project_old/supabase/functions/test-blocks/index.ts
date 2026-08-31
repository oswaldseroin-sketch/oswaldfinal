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

    const method = req.method;

    // GET — return all block assignments
    if (method === "GET") {
      const { data, error } = await supabase
        .from("test_question_blocks")
        .select("question_id, block_number, updated_at")
        .order("question_id", { ascending: true });

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

    // PATCH — set or clear block assignment for a question (admin only)
    if (method === "PATCH") {
      const body = await req.json();
      const { question_id, block_number, password } = body as {
        question_id: string;
        block_number: number | null;
        password: string;
      };

      if (password !== ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Неверный пароль" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!question_id || typeof question_id !== "string") {
        return new Response(JSON.stringify({ error: "question_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // block_number null means remove assignment
      if (block_number === null) {
        const { error: delError } = await supabase
          .from("test_question_blocks")
          .delete()
          .eq("question_id", question_id);

        if (delError) {
          return new Response(JSON.stringify({ error: delError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({ question_id, block_number: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (typeof block_number !== "number" || block_number < 1 || block_number > 4) {
        return new Response(JSON.stringify({ error: "block_number must be 1-4 or null" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("test_question_blocks")
        .upsert(
          { question_id, block_number, updated_at: new Date().toISOString() },
          { onConflict: "question_id" }
        )
        .select("question_id, block_number, updated_at")
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
