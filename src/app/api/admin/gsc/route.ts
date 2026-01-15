import { NextResponse } from 'next/server';
import { getGSCTopQueries } from '@/services/gscService';

export async function GET() {
    try {
        if (!process.env.GSC_CLIENT_EMAIL || !process.env.GSC_PRIVATE_KEY) {
            return NextResponse.json({ error: 'GSC not configured', configured: false }, { status: 200 });
        }

        const queries = await getGSCTopQueries(90); // Fetch last 90 days
        return NextResponse.json({ queries, configured: true });
    } catch (error: any) {
        console.error('GSC API Error:', error);
        return NextResponse.json({ error: error.message, configured: true }, { status: 500 });
    }
}
