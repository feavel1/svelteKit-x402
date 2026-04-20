<script lang="ts">
	import WalletButton from '$lib/wallet/ui/WalletButton.svelte';
	import { x402 } from '$lib/x402';

	let content = $state<any>(null);

	async function loadPremiumContent() {
		content = null;

		try {
			const response = await x402.fetch('/api/premium');
			content = await response.json();
		} catch (err) {
			// console.log(err);
			// Error is already in the store
		}
	}
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<WalletButton />

<button onclick={loadPremiumContent} disabled={$x402.loading} class="primary-button">
	{$x402.loading ? 'Processing...' : 'Get Premium Content'}
</button>

{#if content?.accepts[0].maxAmountRequired != null}
	Price: {content.accepts[0].maxAmountRequired}
{/if}

{#if $x402.status}
	<div class="text-blue-700">
		{$x402.status}
	</div>
{/if}

{#if $x402.error}
	<div class="text-red-900">
		{$x402.error}
	</div>
{/if}
