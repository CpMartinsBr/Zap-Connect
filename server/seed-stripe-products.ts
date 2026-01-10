// Script to create Stripe products and prices
// Run manually: npx tsx server/seed-stripe-products.ts

import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Creating Stripe products and prices...');

  // Check if products already exist
  const existingProducts = await stripe.products.search({ 
    query: "metadata['app']:'grisly'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Products already exist. Skipping creation.');
    console.log('Existing products:', existingProducts.data.map(p => p.name));
    return;
  }

  // Create Pro Plan product
  const proPlan = await stripe.products.create({
    name: 'Plano Pro',
    description: 'Para quem está crescendo. WhatsApp, mais contatos e relatórios.',
    metadata: {
      app: 'grisly',
      plan_name: 'pro',
    },
  });

  // Create Pro Plan monthly price (R$ 49,90/mês)
  const proMonthlyPrice = await stripe.prices.create({
    product: proPlan.id,
    unit_amount: 4990, // R$ 49,90 in centavos
    currency: 'brl',
    recurring: { interval: 'month' },
    metadata: {
      plan_name: 'pro',
      interval: 'monthly',
    },
  });

  console.log('Created Pro Plan:', proPlan.id);
  console.log('Created Pro Monthly Price:', proMonthlyPrice.id);

  // Create Premium Plan product
  const premiumPlan = await stripe.products.create({
    name: 'Plano Premium',
    description: 'Para equipes. Tudo do Pro + múltiplos usuários e API.',
    metadata: {
      app: 'grisly',
      plan_name: 'premium',
    },
  });

  // Create Premium Plan monthly price (R$ 99,90/mês)
  const premiumMonthlyPrice = await stripe.prices.create({
    product: premiumPlan.id,
    unit_amount: 9990, // R$ 99,90 in centavos
    currency: 'brl',
    recurring: { interval: 'month' },
    metadata: {
      plan_name: 'premium',
      interval: 'monthly',
    },
  });

  console.log('Created Premium Plan:', premiumPlan.id);
  console.log('Created Premium Monthly Price:', premiumMonthlyPrice.id);

  console.log('\n=== Summary ===');
  console.log('Pro Plan Product ID:', proPlan.id);
  console.log('Pro Plan Price ID:', proMonthlyPrice.id);
  console.log('Premium Plan Product ID:', premiumPlan.id);
  console.log('Premium Plan Price ID:', premiumMonthlyPrice.id);
  console.log('\nProducts created successfully! Webhooks will sync them to the database.');
}

createProducts().catch(console.error);
