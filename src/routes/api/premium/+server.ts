import { json } from '@sveltejs/kit';
import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server';
import { ExactSvmScheme } from '@x402/svm/exact/server';
import { encodePaymentRequiredHeader } from '@x402/core/http';
import { TREASURY_ADDRESS, FACILITATOR_URL } from '$env/static/private';

// Validate env vars
if (!TREASURY_ADDRESS || !FACILITATOR_URL) {
	console.error('❌ Missing required env: TREASURY_ADDRESS, FACILITATOR_URL');
	process.exit(1);
}

// Setup payment server
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
	'solana:*',
	new ExactSvmScheme()
);
await resourceServer.initialize();

// Build payment requirements once
const paymentRequirements = await resourceServer.buildPaymentRequirements({
	scheme: 'exact',
	price: '$0.001',
	network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
	payTo: TREASURY_ADDRESS
});
if (paymentRequirements.length === 0) {
	console.error('❌ Failed to build payment requirements');
	process.exit(1);
}

export async function GET({ request }) {
	const paymentHeader =
		request.headers.get('payment-signature') || request.headers.get('x-payment');

	if (!paymentHeader) {
		const response = {
			x402Version: 2,
			error: 'Payment required',
			resource: {
				url: request.url,
				description: 'Some premium data',
				mimeType: 'application/json'
			},
			accepts: [paymentRequirements[0]]
		};
		return json(
			{ error: 'Payment required' },
			{
				status: 402,
				headers: { 'PAYMENT-REQUIRED': encodePaymentRequiredHeader(response) }
			}
		);
	}
	try {
		// Step 3: Verify payment
		console.log('🔐 Payment provided, verifying with facilitator...');

		const paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf-8'));
		const verifyResult = await resourceServer.verifyPayment(paymentPayload, paymentRequirements[0]);

		if (!verifyResult.isValid) {
			console.log(`❌ Payment verification failed: ${verifyResult.invalidReason}`);
			return json(
				{
					error: 'Invalid Payment',
					reason: verifyResult.invalidReason
				},
				{
					status: 402
				}
			);
		}
		console.log('✅ Payment verified successfully');
		try {
			const settleResult = await resourceServer.settlePayment(
				paymentPayload,
				paymentRequirements[0]
			);
			console.log(`✅ Payment settled: ${settleResult.transaction}`);
			const settlementHeader = Buffer.from(JSON.stringify(settleResult)).toString('base64');
			return json(
				{
					message: 'Premium content unlocked!',
					timestamp: new Date().toISOString()
				},
				{
					headers: { 'PAYMENT-RESPONSE': settlementHeader }
				}
			);
		} catch (error) {
			console.error(`❌ Settlement failed: ${error}`);
		}
	} catch (error) {
		console.error(`❌ Payment processing error: ${error}`);
		return json(
			{
				error: 'Payment Processing Error',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{
				status: 500
			}
		);
	}
	console.log('💰 Settling payment on-chain...');

	return json({
		message: 'Premium content unlocked!',
		timestamp: new Date().toISOString()
	});
}
