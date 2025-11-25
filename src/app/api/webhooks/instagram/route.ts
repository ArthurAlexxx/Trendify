
import { NextRequest, NextResponse } from 'next/server';

// Este é o seu token secreto. Ele DEVE corresponder ao que você colocar no painel da Meta.
const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'trendify-webhook-secret';

/**
 * Handles the webhook verification request from Meta.
 * When you configure your webhook in the Meta Developer Dashboard, Meta will send a GET
 * request to this endpoint to verify its authenticity.
 *
 * Example: GET /api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_STRING
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  // Check if a 'hub.mode' and 'hub.verify_token' are present in the query string.
  if (mode && token) {
    // Verifies that the mode is 'subscribe' and the token matches your secret.
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      // Responds with the challenge token from the request to verify the webhook.
      // Note: We use the standard `Response` object to return the plain text challenge.
      return new Response(challenge, { status: 200 });
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match.
      console.error('Webhook verification failed: Token mismatch.');
      return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
    }
  } else {
    // Responds with '400 Bad Request' if required parameters are missing.
     return NextResponse.json({ error: 'Missing hub.mode or hub.verify_token' }, { status: 400 });
  }
}

/**
 * Handles incoming webhook event notifications from Meta.
 * After verification, Meta will send POST requests to this endpoint with updates
 * for the topics you've subscribed to (e.g., new comments, messages, etc.).
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // Imprime o corpo completo do evento no console para depuração.
        // Em produção, você substituiria isso pela lógica para processar o evento
        // (ex: salvar um novo comentário no Firestore).
        console.log('Received webhook event:', JSON.stringify(body, null, 2));

        // Meta requires a 200 OK response to acknowledge receipt of the event.
        return NextResponse.json({ status: 'success' }, { status: 200 });
    } catch (error: any) {
        console.error('Error processing webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
