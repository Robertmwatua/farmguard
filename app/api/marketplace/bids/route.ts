import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const payload = await request.json();
    const requestId = String(payload.requestId ?? "").trim();
    const price = Number(payload.price);
    const deliveryDays = Number(payload.deliveryDays ?? 1);
    const message = String(payload.message ?? "").trim();

    if (!requestId || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: "Request ID and a valid price are required." }, { status: 400 });
    }

    // Resolve agrovet shop name from profiles
    const { data: profile } = await supabase
      .from("agrovet_profiles")
      .select("shop_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const agrovetName = profile?.shop_name || user.email?.split("@")[0] || "Registered Agrovet";

    const { data, error } = await supabase
      .from("marketplace_bids")
      .insert([
        {
          request_id: requestId,
          agrovet_id: user.id,
          agrovet_name: agrovetName,
          price,
          delivery_days: deliveryDays,
          message,
          status: "pending"
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("[marketplace/bids] Insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ bid: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Bidding failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const payload = await request.json();
    const bidId = String(payload.bidId ?? "").trim();
    const action = String(payload.action ?? "").trim(); // 'accept'

    if (!bidId || action !== "accept") {
      return NextResponse.json({ error: "Bid ID and action 'accept' are required." }, { status: 400 });
    }

    // Resolve the bid and joined request to verify farmer ownership
    const { data: bidData, error: fetchError } = await supabase
      .from("marketplace_bids")
      .select("*, request:marketplace_requests(*)")
      .eq("id", bidId)
      .single();

    if (fetchError || !bidData) {
      return NextResponse.json({ error: "Bid record not found." }, { status: 404 });
    }

    const requestOwnerId = bidData.request?.user_id;
    if (requestOwnerId !== user.id) {
      return NextResponse.json({ error: "Access denied. Only the ticket creator can accept bids." }, { status: 403 });
    }

    // 1. Accept this specific bid
    const { error: acceptError } = await supabase
      .from("marketplace_bids")
      .update({ status: "accepted" })
      .eq("id", bidId);

    if (acceptError) throw new Error(acceptError.message);

    // 2. Reject all other bids for this ticket
    await supabase
      .from("marketplace_bids")
      .update({ status: "rejected" })
      .eq("request_id", bidData.request_id)
      .neq("id", bidId);

    // 3. Mark the request ticket as completed
    await supabase
      .from("marketplace_requests")
      .update({ status: "completed" })
      .eq("id", bidData.request_id);

    return NextResponse.json({ success: true, message: "Bid accepted successfully and ticket resolved." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Transaction failed" }, { status: 500 });
  }
}
