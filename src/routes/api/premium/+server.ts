import { json } from '@sveltejs/kit';
import { x402ResourceServer, HTTPFacilitatorClient, type ResourceConfig } from '@x402/core/server';
import { ExactSvmScheme } from '@x402/svm/exact/server';
import type { PaymentRequired, PaymentRequirements } from '@x402/core/types';
import { TREASURY_ADDRESS, FACILITATOR_URL } from '$env/static/private';
import { encodePaymentRequiredHeader } from '@x402/core/http';

const svmAddress = TREASURY_ADDRESS;
const facilitatorUrl = FACILITATOR_URL;

if (!svmAddress) {
	console.error('❌ SVM_ADDRESS environment variable is required');
	process.exit(1);
}

if (!facilitatorUrl) {
	console.error('❌ FACILITATOR_URL environment variable is required');
	process.exit(1);
}

// Create facilitator client and resource server
const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
	'solana:*',
	new ExactSvmScheme()
);

await resourceServer.initialize();

// console.log(resourceServer.getSupportedKind(2, 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', 'exact'));

// Define route configurations (will be converted to PaymentRequirements at runtime)
interface RoutePaymentConfig extends ResourceConfig {
	description: string;
	mimeType: string;
}
const routeConfigs: Record<string, RoutePaymentConfig> = {
	'GET /api/premium': {
		scheme: 'exact',
		price: '$0.001',
		network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
		payTo: svmAddress,
		description: 'Some premium data',
		mimeType: 'application/json'
	}
};

// Cache for built payment requirements
const routeRequirements: Record<string, PaymentRequirements> = {};

export async function GET({ request: req }) {
	await resourceServer.initialize();

	const routeKey = `GET /api/premium`;
	const routeConfig = routeConfigs[routeKey];

	// console.log(`📥 Request received: ${JSON.stringify(routeConfig)}`);

	// Build PaymentRequirements from config (cached for efficiency)
	if (!routeRequirements[routeKey]) {
		const builtRequirements = await resourceServer.buildPaymentRequirements(routeConfig);
		if (builtRequirements.length === 0) {
			console.error('❌ Failed to build payment requirements');
			return json({
				message: 'Server configuration error',
				status: '500'
			});
		}
		routeRequirements[routeKey] = builtRequirements[0];
	}
	const requirements = routeRequirements[routeKey];

	console.log('Requirements: ' + JSON.stringify(requirements));

	const paymentHeader = (req.headers.get('payment-signature') || req.headers.get('x-payment')) as
		| string
		| undefined;

	if (!paymentHeader) {
		// Step 2: Return 402 with payment requirements

		const response: PaymentRequired = {
			x402Version: 2,
			error: 'Failed building required response',
			resource: {
				url: req.url,
				description: routeConfig.description,
				mimeType: routeConfig.mimeType
			},
			accepts: [requirements]
		};

		// Use base64 encoding for the PAYMENT-REQUIRED header (v2 protocol)
		const requirementsHeader = encodePaymentRequiredHeader(response);

		// console.log('🥹 Payment requirementsHeader: ' + requirementsHeader);

		return json(
			{ error: 'Invalid payment' },
			{
				status: 402,
				headers: { 'PAYMENT-REQUIRED': requirementsHeader }
			}
		);
	}

	return json({
		message: 'Premium content unlocked!',
		timestamp: new Date().toISOString()
	});
}
