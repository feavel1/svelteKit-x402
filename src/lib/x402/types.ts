type ResourceInfo = {
	url: string;
	description?: string;
	mimeType?: string;
};
type PaymentRequirements = {
	scheme: string;
	network: string;
	asset: string;
	amount: string;
	payTo: string;
	maxTimeoutSeconds: number;
	extra: Record<string, unknown>;
};
type PaymentRequired = {
	x402Version: number;
	error?: string;
	resource: ResourceInfo;
	accepts: PaymentRequirements[];
	extensions?: Record<string, unknown>;
};
type PaymentPayload = {
	x402Version: number;
	resource?: ResourceInfo;
	accepted: PaymentRequirements;
	payload: Record<string, unknown>;
	extensions?: Record<string, unknown>;
};

// type VerifyRequest = {
// 	x402Version: number;
// 	paymentPayload: PaymentPayload;
// 	paymentRequirements: PaymentRequirements;
// };
// type VerifyResponse = {
// 	isValid: boolean;
// 	invalidReason?: string;
// 	invalidMessage?: string;
// 	payer?: string;
// 	extensions?: Record<string, unknown>;
// };

interface X402State {
	loading: boolean;
	status: string | null;
	error: string | null;
}

export type { X402State, PaymentPayload, PaymentRequired, PaymentRequirements, ResourceInfo };
