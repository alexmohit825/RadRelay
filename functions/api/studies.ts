interface Env {
  RADRELAY_KV: KVNamespace;
}

// In-memory fallback for local dev when KV binding is absent
const memoryVault = new Map<string, any>();

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS headers
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  });

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // GET /api/studies?id=p1 - Retrieve study
  if (request.method === 'GET') {
    const studyId = url.searchParams.get('id');
    if (!studyId) {
      // List all studies
      let studies: any[] = [];
      if (env.RADRELAY_KV) {
        const list = await env.RADRELAY_KV.list({ prefix: 'study:' });
        for (const key of list.keys) {
          const val = await env.RADRELAY_KV.get(key.name, 'json');
          if (val) studies.push(val);
        }
      } else {
        studies = Array.from(memoryVault.values());
      }
      return new Response(JSON.stringify({ success: true, count: studies.length, studies }), { headers });
    }

    let study = null;
    if (env.RADRELAY_KV) {
      study = await env.RADRELAY_KV.get(`study:${studyId}`, 'json');
    } else {
      study = memoryVault.get(`study:${studyId}`) || null;
    }

    if (!study) {
      return new Response(JSON.stringify({ success: false, error: 'Study not found' }), {
        status: 404,
        headers,
      });
    }

    return new Response(JSON.stringify({ success: true, study }), { headers });
  }

  // POST /api/studies - Store patient study payload
  if (request.method === 'POST') {
    try {
      const payload = await request.json();
      const studyId = payload.patientId || `STUDY-${Date.now()}`;
      const record = {
        id: studyId,
        patientName: payload.patientName || 'Anonymous',
        patientId: payload.patientId || 'MRN-TEMP',
        modality: payload.modality || 'MR',
        studyDate: payload.studyDate || new Date().toISOString().split('T')[0],
        seriesDescription: payload.seriesDescription || 'Spine Series',
        sliceCount: payload.sliceCount || 1,
        sourceType: payload.sourceType || 'PUBLIC_UPLOAD',
        slices: payload.slices || [],
        timestamp: new Date().toISOString(),
      };

      if (env.RADRELAY_KV) {
        await env.RADRELAY_KV.put(`study:${studyId}`, JSON.stringify(record), {
          expirationTtl: 60 * 60 * 24 * 7, // 7-day retention
        });
      } else {
        memoryVault.set(`study:${studyId}`, record);
      }

      return new Response(JSON.stringify({ success: true, studyId, message: 'Study persisted in RadRelay Cloud Vault' }), {
        headers,
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err?.message || 'Invalid JSON' }), {
        status: 400,
        headers,
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
};
