// Stripe client for Replit integration
// Fetches credentials from Replit connection API with caching

import Stripe from 'stripe';

// Cache credentials to avoid repeated API calls
let cachedCredentials: { publishableKey: string; secretKey: string } | null = null;
let credentialsFetchPromise: Promise<{ publishableKey: string; secretKey: string }> | null = null;

async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  // Return cached credentials if available
  if (cachedCredentials) {
    return cachedCredentials;
  }

  // Prevent duplicate concurrent fetches
  if (credentialsFetchPromise) {
    return credentialsFetchPromise;
  }

  credentialsFetchPromise = fetchCredentials();
  
  try {
    cachedCredentials = await credentialsFetchPromise;
    return cachedCredentials;
  } finally {
    credentialsFetchPromise = null;
  }
}

async function fetchCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  // Allow direct environment variables for non-Replit deployments
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY) {
    return {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
    };
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) {
    throw new Error('Stripe not configured: Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY, or configure Replit Stripe integration');
  }

  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error('Stripe not configured: Replit identity token not found');
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';

  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Stripe credentials: ${response.status}`);
  }

  const data = await response.json();
  const connectionSettings = data.items?.[0];

  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found - configure in Replit integrations`);
  }

  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
}

// Get fresh Stripe client (never cache)
export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
  });
}

// Get publishable key for frontend
export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

// Get secret key for server operations
export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

// StripeSync singleton for webhook processing and data sync
let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();

    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
