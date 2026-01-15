import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

export async function getGSCClient() {
    const clientEmail = process.env.GSC_CLIENT_EMAIL;
    const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
        throw new Error('GSC credentials are not configured');
    }

    const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: SCOPES,
    });

    return google.searchconsole({ version: 'v1', auth });
}

export async function getGSCTopQueries(days: number = 30) {
    const searchconsole = await getGSCClient();
    const siteUrl = process.env.GSC_SITE_URL;

    if (!siteUrl) {
        throw new Error('GSC_SITE_URL is not configured');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date(); // Today

    const response = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            dimensions: ['query'],
            rowLimit: 50,
        },
    });

    return response.data.rows || [];
}
