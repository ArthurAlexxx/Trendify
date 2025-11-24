
import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'trendify-webhook-secret';

/**
 * Handles the verification request from Meta for the webhook.
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  // Checks if a 'hub.mode' and 'hub.verify_token' is present
  if (mode && token) {
    // Checks the mode and token sent are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      // The challenge needs to be sent back as the body, not as JSON.
      // Use the standard Web API `Response` object for this.
      return new Response(challenge, { status: 200 });
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
    }
  } else {
     return NextResponse.json({ error: 'Missing hub.mode or hub.verify_token' }, { status: 400 });
  }
}

/**
 * Handles incoming webhook events from Meta.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('Received webhook:', JSON.stringify(body, null, 2));

        // Process the webhook event here
        // (e.g., save comments, story updates, etc. to Firestore)

        return NextResponse.json({ status: 'success' }, { status: 200 });
    } catch (error: any) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
