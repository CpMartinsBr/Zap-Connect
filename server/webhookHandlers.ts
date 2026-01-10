// Stripe webhook handlers
// Processes webhook events and syncs data to database

import { getStripeSync } from './stripeClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    // Validate payload is a Buffer (not parsed JSON)
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // stripe-replit-sync handles all webhook processing automatically
    // It syncs subscription status, customer data, etc. to the stripe schema
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
}
