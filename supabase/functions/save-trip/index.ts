import { corsHeaders } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user, supabase } = await requireAuth(req); // Use user-scoped client
    const { destination, start_date, end_date, notes } = await req.json();
    if (!destination) {
      return new Response(JSON.stringify({ error: "destination is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data, error } = await supabase
      .from("trips")
      .insert({ user_id: user.id, destination, start_date: start_date ?? null, end_date: end_date ?? null, notes: notes ?? null })
      .select()
      .single();
    if (error) throw error;
    return new Response(JSON.stringify({ trip: data }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return new Response(JSON.stringify({ error: "Unexpected error", detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
