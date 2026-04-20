import type { X402State } from './types.js';
import { writable, get } from 'svelte/store';
import { wallet } from '$lib/wallet/standard';
import { x402Client } from '@x402/core/client';
import { wrapFetchWithPayment } from '@x402/fetch';
import { ExactSvmScheme } from '@x402/svm/exact/client';
import { createSignerFromWalletAccount } from '@solana/wallet-account-signer';

function createX402Store() {
	const { subscribe, set, update } = writable<X402State>({
		loading: false,
		status: null,
		error: null
	});

	return {
		subscribe,

		async fetch(url: string, options: RequestInit = {}): Promise<Response> {
			set({ loading: true, status: null, error: null });

			// Initial request
			const response = await fetch(url, options);

			console.log('Response from server: ' + JSON.stringify(await response.json()));

			if (response.status !== 402) {
				set({ loading: false, status: 'Success != 402', error: null });
				return response;
			}
			update((s) => ({ ...s, status: 'Payment required' }));

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
