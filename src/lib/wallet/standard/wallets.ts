import { writable, derived, get } from 'svelte/store';
import type { Wallet } from '@wallet-standard/base';
import { getWallets } from '@wallet-standard/app';
import { StandardConnect } from '@wallet-standard/features';
import type { StandardConnectFeature } from '@wallet-standard/features';
import { getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from '@wallet-standard/ui-registry';
import { browser } from '$app/environment';
import { connect } from 'solana-kite';
import type { UiWallet } from '@wallet-standard/ui';

interface WalletState {
	connected: boolean;
	UiWallet: UiWallet | null;
	connecting: boolean;
	error: Error | null;
}

function createWalletStore() {
	const initialState: WalletState = {
		connected: false,
		UiWallet: null,
		connecting: false,
		error: null
	};

	const { subscribe, set, update } = writable<WalletState>(initialState);

	return {
		subscribe,

		async connect(wallet: Wallet) {
			if (!browser) return;

			// Prevent duplicate connections
			const currentState = get(this);
			if (currentState.connecting || currentState.connected) return;

			try {
				// Check if wallet supports StandardConnect feature
				const connectFeature = wallet.features[
					StandardConnect
				] as StandardConnectFeature[typeof StandardConnect];
				if (!connectFeature?.connect) {
					throw new Error('Wallet does not support connection');
				}

				update((state) => ({ ...state, connecting: true, error: null }));

				const result = await connectFeature.connect();
				const account = result.accounts[0];

				if (account) {
					// Get the unified UI wallet object
					const uiWallet =
						getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(wallet);

					set({
						connected: true,
						UiWallet: uiWallet,
						connecting: false,
						error: null
					});
				}
			} catch (err) {
				update((state) => ({
					...state,
					connecting: false,
					error: err instanceof Error ? err : new Error(String(err))
				}));
			}
		},

		async disconnect() {
			if (!browser) return;

			const currentState = get(this);
			const currentUiWallet = currentState.UiWallet;
			if (!currentUiWallet) return;

			try {
				// Note: We don't have direct access to the original wallet object anymore
				// for disconnect feature, but we can still clear the state
				// Clear state regardless
				set({ ...initialState });
			} catch (err) {
				update((state) => ({
					...state,
					error: err instanceof Error ? err : new Error(String(err))
				}));
			}
		},

		// Get available Solana-compatible wallets from registry
		getAvailableWallets(): Wallet[] {
			if (!browser) return [];

			const registry = getWallets();
			const allWallets = registry.get();

			return allWallets
				.filter((wallet) => wallet.chains?.some((chain) => chain.startsWith('solana:')))
				.sort((a, b) => a.name.localeCompare(b.name));
		},

		// Check if already connected on page load
		async checkConnection() {
			if (!browser) return;

			const registry = getWallets();
			const wallets = registry.get();

			for (const wallet of wallets) {
				// Check if wallet has accounts (already connected)
				if (wallet.accounts?.length > 0) {
					// Get the unified UI wallet object
					const uiWallet =
						getOrCreateUiWalletForStandardWallet_DO_NOT_USE_OR_YOU_WILL_BE_FIRED(wallet);

					set({
						connected: true,
						UiWallet: uiWallet,
						connecting: false,
						error: null
					});
					return;
				}
			}
		}
	};
}

export const wallet = createWalletStore();

// Derived store for wallet address string
export const walletAddress = derived(
	wallet,
	($wallet) => $wallet.UiWallet?.accounts[0]?.address ?? null
);

// Derived store for available wallets
export const availableWallets = derived(wallet, () => wallet.getAvailableWallets());

// Derived store for the connection
export const connection = derived(wallet, ($wallet) => {
	if (!$wallet.connected || !$wallet.UiWallet) {
		return null;
	}
	return connect('devnet');
});
