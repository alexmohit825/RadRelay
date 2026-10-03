interface Env {
  RADRELAY_KV: KVNamespace;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  if (request.method === 'POST') {
    try {
      const { patientId, patientName, phoneNumber } = await request.json() as any;
      const uploadToken = `TOKEN-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const origin = new URL(request.url).origin;
      const uploadUrl = `${origin}/?upload_token=${uploadToken}&patient_id=${encodeURIComponent(patientId)}&name=${encodeURIComponent(patientName)}`;

      // Store token in KV with 72-hour TTL
      if (env.RADRELAY_KV) {
        await env.RADRELAY_KV.put(
          `token:${uploadToken}`,
          JSON.stringify({ patientId, patientName, phoneNumber, createdAt: new Date().toISOString() }),
          { expirationTtl: 60 * 60 * 72 }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          uploadToken,
          uploadUrl,
          message: `SMS Invite generated for ${phoneNumber || 'Patient Phone'}. Link expires in 72 hours.`,
        }),
        { headers }
      );
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err?.message }), { status: 400, headers });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
};
