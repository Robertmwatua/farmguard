import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // Fetch requests alongside their joined bids
    const { data, error } = await supabase
      .from("marketplace_requests")
      .select("*, bids:marketplace_bids(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[marketplace/requests] Fetch error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Fetch failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const payload = await request.json();
    const plantName = String(payload.plantName ?? "").trim();
    const disease = String(payload.disease ?? "").trim();
    const treatmentNeeded = String(payload.treatmentNeeded ?? "").trim();
    const quantity = String(payload.quantity ?? "1 unit").trim();
    const description = String(payload.description ?? "").trim();

    if (!plantName || !disease || !treatmentNeeded) {
      return NextResponse.json({ error: "Plant name, disease, and treatment prescription are required." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("marketplace_requests")
      .insert([
        {
          user_id: user.id,
          plant_name: plantName,
          disease,
          treatment_needed: treatmentNeeded,
          quantity,
          description,
          status: "active"
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("[marketplace/requests] Insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Request failed" }, { status: 500 });
  }
}
