import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import axios from 'axios';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_idStr = searchParams.get('telegram_id');

        if (!telegram_idStr) {
            return NextResponse.json({ success: false, error: 'telegram_id is required' }, { status: 400 });
        }

        const telegram_id = parseInt(telegram_idStr, 10);

        // 1. Fetch Profile to get CGM settings
        const { data: profile, error } = await supabaseAdmin
            .from('profiles')
            .select('cgm_settings')
            .eq('telegram_id', telegram_id)
            .single();

        if (error || !profile) {
            return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
        }

        const cgm = profile.cgm_settings;

        if (!cgm || cgm.type === 'none' || !cgm.nightscout_url) {
            return NextResponse.json({ success: true, active: false });
        }

        if (cgm.type === 'nightscout') {
            // Clean URL (remove trailing slash)
            const baseUrl = cgm.nightscout_url.replace(/\/$/, '');
            let apiUrl = `${baseUrl}/api/v1/entries.json?count=1`;
            
            if (cgm.nightscout_token) {
                apiUrl += `&token=${cgm.nightscout_token}`;
            }

            try {
                const response = await axios.get(apiUrl, { timeout: 5000 });
                if (response.data && response.data.length > 0) {
                    const entry = response.data[0];
                    
                    // Nightscout values can be mg/dl or mmol/L. Usually 'sgv' is mg/dl or sysTime is used
                    // We need to determine if it needs conversion to mmol/L. 
                    // Usually if sgv > 30, it's mg/dl.
                    let glucose = entry.sgv || entry.mbg || 0;
                    
                    if (glucose > 30) {
                        glucose = Math.round((glucose / 18.0182) * 10) / 10;
                    }

                    return NextResponse.json({
                        success: true,
                        active: true,
                        data: {
                            glucose, // in mmol/L
                            direction: entry.direction || 'NONE',
                            date: entry.date,
                            dateString: entry.dateString
                        }
                    });
                } else {
                    return NextResponse.json({ success: false, error: 'No data from Nightscout' }, { status: 404 });
                }
            } catch (nsError: any) {
                console.error("Nightscout fetch error:", nsError.message);
                return NextResponse.json({ success: false, error: 'Failed to connect to Nightscout' }, { status: 502 });
            }
        }

        return NextResponse.json({ success: false, error: 'Unsupported CGM type' }, { status: 400 });

    } catch (error: any) {
        console.error("CGM API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
