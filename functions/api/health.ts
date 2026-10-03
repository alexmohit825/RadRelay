export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify({
      status: 'HEALTHY',
      service: 'RadRelay Edge Cloud Gateway',
      region: 'WAF / Cloudflare Global V8 Edge',
      timestamp: new Date().toISOString(),
      capabilities: ['DICOM_INTAKE', 'SMART_FHIR_PROXY', 'CHANGE_PACS_SCU_RELAY'],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  );
};
