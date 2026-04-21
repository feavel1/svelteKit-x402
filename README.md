# SvelteKit x402 using kit Client/Server Demo

Not using any middleware or hooks to have full control over the default x402 procedure

## +server.ts

```ts
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
```

## x402.ts

// simple client svelte store to have some frontend feedback

```ts
import type { X402State } from './types.js';
import { writable, get } from 'svelte/store';
import { wallet } from '$lib/wallet/standard';
import { x402Client } from '@x402/core/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { ExactSvmScheme } from '@x402/svm/exact/client';
import { createSignerFromWalletAccount } from '@solana/wallet-account-signer';

function createX402Store() {
	const { subscribe, set } = writable<X402State>({
		loading: false,
		status: null,
		error: null
	});

	return {
		subscribe,
		async fetch(url: string): Promise<Response> {
			set({ loading: true, status: 'Payment required~', error: null });

			try {
				const $wallet = get(wallet);
				if (!$wallet.connected || !$wallet.UiWallet) {
					throw new Error('Wallet not connected, connect wallet and retry');
				}
				const walletAccount = $wallet.UiWallet.accounts[0];

				// Create x402 client and register SVM scheme
				const client = new x402Client();
				const svmSigner = createSignerFromWalletAccount(walletAccount, 'solana:devnet');

				client.register('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', new ExactSvmScheme(svmSigner));

				// Wrap fetch with payment handling
				const fetchWithPayment = wrapFetchWithPayment(fetch, client);

				// Make request - payment is handled automatically
				const newresponse = await fetchWithPayment(url);

				const data = await newresponse.json();
				console.log('Response:', data);

				set({ loading: false, status: 'Success!', error: null });
				return newresponse;
			} catch (err) {
				console.log(err);
				const error = (err as Error).message;
				set({ loading: false, status: null, error });
				throw err;
			}
		},
		reset() {
			set({ loading: false, status: null, error: null });
		}
	};
}

export const x402 = createX402Store();
```

## Future development plans and use cases

1. Maybe add transaction cancell?
2. Add a db to record purchased content
3. Explore extentions integration
4. Let the user pay for some content, do some db operation and return `Success!`

Use full link: [Solana get started with 402](https://solana.com/developers/guides/getstarted/intro-to-x402)

Wallet dependencies used in $lib/wallet/standard and wallet transactionsigner (@solana/wallet-account-signer)

```bash
bun i @wallet-standard/base @wallet-standard/app @wallet-standard/features @wallet-standard/ui-registry @wallet-standard/ui @solana/wallet-account-signer
```

x402 client dependencies used in $lib/x402/x402.ts and /api/premium/+server.ts

```bash
bun i @x402/core @x402/fetch @x402/svm
```

#svelte #solana #wallet-standard #x402 #server/client
