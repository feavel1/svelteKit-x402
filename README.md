# 💸 SvelteKit + x402: Premium Content with Wallet Payments

> *Pay-per-access protected routes on Solana, using `wallet-standard` and the x402 protocol. No middleware – full control.*

![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)
![Solana](https://img.shields.io/badge/Solana-9945FF?logo=solana&logoColor=white)
![x402](https://img.shields.io/badge/x402-payments-blue)

---

## 🚀 What it does

- Protects an API endpoint (`/api/premium`) with **HTTP 402 Payment Required**  
- Users connect their **Solana wallet** (via `wallet-standard`)  
- Client automatically pays **exactly $1** (or equivalent SOL)  
- Server verifies payment, settles, and unlocks premium content  

---

## 🧱 How it works (simplified)

### 1. Server (`api/premium/+server.ts`)

- Sets payment requirement: `price: "$1"`, treasury address, network  
- Returns `402` + `PAYMENT-REQUIRED` header if no payment  
- Verifies incoming payment signature, settles on-chain  
- Responds with premium data + `PAYMENT-RESPONSE` header  

### 2. Client store (`x402.ts`)

- Svelte store that wraps `fetch`  
- Uses connected wallet to sign payment  
- Handles the x402 flow automatically (retry with payment)  

### 3. Wallet integration

- `$lib/wallet/standard` – standard wallet adapter  
- `@solana/wallet-account-signer` – turns wallet account into a signer for SVM  

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `@x402/core`, `@x402/fetch`, `@x402/svm` | x402 client/server logic |
| `@wallet-standard/*` | Wallet connection & UI |
| `@solana/wallet-account-signer` | Signer for SVM scheme |

```bash
# Install everything
bun i @wallet-standard/base @wallet-standard/app @wallet-standard/features @wallet-standard/ui-registry @wallet-standard/ui @solana/wallet-account-signer
bun i @x402/core @x402/fetch @x402/svm
```

---

## 🔮 Future plans

- [ ] Transaction cancel / refund  
- [ ] Database to track purchased content  
- [ ] Browser extension integration  
- [ ] Pay → DB update → return success  

---

## 📚 Learn more

[Solana x402 guide →](https://solana.com/developers/guides/getstarted/intro-to-x402)

---

Made with ☕ and a bit of frustration (but it works).  
\#svelte \#solana \#wallet-standard \#x402
