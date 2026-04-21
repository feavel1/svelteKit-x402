import { json } from '@sveltejs/kit';
import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server';
import { ExactSvmScheme } from '@x402/svm/exact/server';
import { encodePaymentRequiredHeader } from '@x402/core/http';
import { TREASURY_ADDRESS, FACILITATOR_URL } from '$env/static/private';

if (!TREASURY_ADDRESS || !FACILITATOR_URL)
	throw new Error('Missing TREASURY_ADDRESS or FACILITATOR_URL');

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
	'solana:*',
	new ExactSvmScheme()
);
await resourceServer.initialize();

const paymentReq = (
	await resourceServer.buildPaymentRequirements({
		scheme: 'exact',
		price: '$1',
		network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
		payTo: TREASURY_ADDRESS
	})
)[0];

if (!paymentReq) throw new Error('Failed to build payment requirements');

export async function GET({ request }) {
	const rawPayment = request.headers.get('payment-signature') || request.headers.get('x-payment');
	if (!rawPayment) {
		return json(
			{ error: 'Payment required' },
			{
				status: 402,
				headers: {
					'PAYMENT-REQUIRED': encodePaymentRequiredHeader({
						x402Version: 2,
						error: 'Payment required',
						resource: {
							url: request.url,
							description: 'Some premium data',
							mimeType: 'application/json'
						},
						accepts: [paymentReq]
					})
				}
			}
		);
	}

	const paymentPayload = JSON.parse(Buffer.from(rawPayment, 'base64').toString());
	const { isValid, invalidReason } = await resourceServer.verifyPayment(paymentPayload, paymentReq);
	if (!isValid) {
		return json({ error: 'Invalid Payment', reason: invalidReason }, { status: 402 });
	}

	const settleResult = await resourceServer.settlePayment(paymentPayload, paymentReq);
	return json(
		{ message: 'Premium content unlocked!', timestamp: new Date().toISOString() },
		{
			headers: { 'PAYMENT-RESPONSE': Buffer.from(JSON.stringify(settleResult)).toString('base64') }
		}
	);
}
