import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    // Using a filter that matches all UUIDs to ensure a full table wipe
    const { error } = await supabase
      .from('scans')
      .delete()
      .neq('plant_name', 'ThisWillNeverMatch_WipeEverything'); 

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Clear history error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
