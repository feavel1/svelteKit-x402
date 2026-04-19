<script lang="ts">
	import { wallet, walletAddress, availableWallets } from '$lib/wallet/standard';
	import { browser } from '$app/environment';
	import type { Wallet } from '@wallet-standard/base';

	// Check for existing connection on mount
	$effect(() => {
		if (browser) {
			wallet.checkConnection();
		}
	});

	function truncateAddress(address: string): string {
		return `${address.slice(0, 4)}...${address.slice(-4)}`;
	}

	async function handleConnect(walletToConnect: Wallet) {
		await wallet.connect(walletToConnect);
	}

	async function handleDisconnect() {
		await wallet.disconnect();
	}
</script>

{#if !$availableWallets.length}
	<button class="cursor-not-allowed rounded-md bg-gray-200 px-4 py-2 text-gray-500" disabled>
		No wallets found
	</button>
{:else if $wallet.connected && $walletAddress}
	<div class="wallet-connected">
		<span class="address">{truncateAddress($walletAddress)}</span>
		<button onclick={handleDisconnect} class="disconnect"> Disconnect </button>
	</div>
{:else if $availableWallets.length === 1}
	<button
		class={`rounded-md bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 ${$wallet.connecting ? 'cursor-not-allowed opacity-50' : ''}`}
		onclick={() => handleConnect($availableWallets[0])}
		disabled={$wallet.connecting}
	>
		{$wallet.connecting ? 'Connecting...' : `Connect ${$availableWallets[0].name}`}
	</button>
{:else}
	<!-- Multiple wallets - show dropdown -->
	<div class="relative inline-block">
		<select
			class="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
			onchange={(e) => {
				const selectedIndex = (e.target as HTMLSelectElement).selectedIndex;
				if (selectedIndex > 0 && $availableWallets[selectedIndex - 1]) {
					handleConnect($availableWallets[selectedIndex - 1]);
				}
			}}
		>
			<option value="">Select Wallet</option>
			{#each $availableWallets as wallet}
				<option value={wallet.name}>{wallet.name}</option>
			{/each}
		</select>
	</div>
{/if}
