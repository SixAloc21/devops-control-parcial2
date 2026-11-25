
'use strict';

// ============================================
// DEVOPS CONTROL - OPENTELEMETRY
// INSTRUMENTACION DE TRAZAS HTTP
// ============================================

// No iniciar telemetria durante las pruebas
// ni cuando no este habilitada explicitamente.
if (
  process.env.OTEL_ENABLED === 'true' &&
  process.env.NODE_ENV !== 'test'
) {
  // ==========================================
  // IMPORTACIONES
  // ==========================================

  const { NodeSDK } = require('@opentelemetry/sdk-node');

  const {
    getNodeAutoInstrumentations
  } = require('@opentelemetry/auto-instrumentations-node');

  const {
    OTLPTraceExporter
  } = require('@opentelemetry/exporter-trace-otlp-proto');

  // ==========================================
  // CONFIGURACION DE OPENOBSERVE
  // ==========================================

  const endpoint = process.env.OTEL_TRACES_ENDPOINT;
  const authHeader = process.env.OTEL_AUTH_HEADER;

  // Validar endpoint
  if (!endpoint) {
    console.error(
      '[OpenTelemetry] Falta OTEL_TRACES_ENDPOINT'
    );
    process.exit(1);
  }

  // Validar autenticacion
  if (!authHeader) {
    console.error(
      '[OpenTelemetry] Falta OTEL_AUTH_HEADER'
    );
    process.exit(1);
  }

  // ==========================================
  // CONFIGURACION DEL SDK
  // ==========================================

  const sdk = new NodeSDK({
    serviceName: 'devops-control-backend',

    // Exportar trazas mediante OTLP/HTTP
    traceExporter: new OTLPTraceExporter({
      url: endpoint,
      headers: {
        Authorization: authHeader
      }
    }),

    // Instrumentacion automatica
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false
        }
      })
    ]
  });

  // ==========================================
  // INICIAR OPENTELEMETRY
  // ==========================================

  sdk.start();

  console.log(JSON.stringify({
    evento: 'OPENTELEMETRY_INITIALIZED',
    servicio: 'devops-control-backend',
    estado: 'OK'
  }));

  // ==========================================
  // CIERRE CONTROLADO
  // ==========================================

  process.on('SIGTERM', () => {
    Promise.resolve(sdk.shutdown())
      .catch(error => {
        console.error(
          '[OpenTelemetry] Error al cerrar:',
          error.message
        );
      });
  });
}
