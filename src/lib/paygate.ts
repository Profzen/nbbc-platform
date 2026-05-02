const PAYGATE_BASE_URL = (process.env.PAYGATE_BASE_URL || 'https://paygateglobal.com').replace(/\/$/, '');

type PaygateStatusCode = '0' | '2' | '4' | '6' | string;

export interface PaygateStatusResponse {
  tx_reference?: string;
  identifier?: string;
  payment_reference?: string;
  status?: PaygateStatusCode;
  datetime?: string;
  payment_method?: string;
}

function getAuthToken() {
  const token = String(process.env.PAYGATE_API_TOKEN || '').trim();
  if (!token) {
    throw new Error('PAYGATE_API_TOKEN manquant.');
  }
  return token;
}

export function isPaygateEnabled() {
  return Boolean(String(process.env.PAYGATE_API_TOKEN || '').trim());
}

export function buildPaygateHostedPaymentUrl(params: {
  amount: number;
  identifier: string;
  description: string;
  returnUrl?: string;
  phone?: string;
  network?: string;
}) {
  const token = getAuthToken();
  const qs = new URLSearchParams({
    token,
    amount: String(Math.round(params.amount)),
    description: params.description,
    identifier: params.identifier,
  });

  const returnUrl = String(params.returnUrl || process.env.PAYGATE_RETURN_URL || '').trim();
  if (returnUrl) qs.set('url', returnUrl);
  if (params.phone) qs.set('phone', params.phone);
  if (params.network) qs.set('network', params.network);

  return `${PAYGATE_BASE_URL}/v1/page?${qs.toString()}`;
}

async function postJson<T>(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    throw new Error(`PayGate HTTP ${response.status}: ${text || 'Réponse vide'}`);
  }

  return parsed as T;
}

export async function checkPaygateStatusByIdentifier(identifier: string): Promise<PaygateStatusResponse> {
  const token = getAuthToken();
  return postJson<PaygateStatusResponse>(`${PAYGATE_BASE_URL}/api/v2/status`, {
    auth_token: token,
    identifier,
  });
}

export function mapPaygateStatusToInternal(status?: string) {
  if (status === '0') return 'SUCCESS';
  if (status === '2') return 'PENDING';
  if (status === '4') return 'EXPIRED';
  if (status === '6') return 'CANCELLED';
  return 'FAILED';
}
