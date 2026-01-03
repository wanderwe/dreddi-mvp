import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceKey);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Missing invite token" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("promises")
      .select(`
        id,
        title,
        details,
        due_at,
        status,
        counterparty_id,
        profiles:creator_id (
          id,
          handle,
          display_name
        )
      `)
      .eq("invite_token", token)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Invite not found or expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      promise: {
        id: data.id,
        title: data.title,
        details: data.details,
        due_at: data.due_at,
        status: data.status,
        is_claimed: !!data.counterparty_id,
        creator: data.profiles,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "API crashed", message: e.message },
      { status: 500 }
    );
  }
}
