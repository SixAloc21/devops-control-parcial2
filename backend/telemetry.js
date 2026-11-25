
'use strict';

// ============================================
// DEVOPS CONTROL - OPENTELEMETRY
// TRAZAS HTTP + METRICAS OTLP
// ============================================

if (
  process.env.OTEL_ENABLED === 'true' &&
  process.env.NODE_ENV !== 'test'
) {
  const { NodeSDK } = require('@opentelemetry/sdk-node');

  const {
    getNodeAutoInstrumentations
  } = require('@opentelemetry/auto-instrumentations-node');

  const {
    OTLPTraceExporter
  } = require('@opentelemetry/exporter-trace-otlp-proto');

  const {
    OTLPMetricExporter
  } = require('@opentelemetry/exporter-metrics-otlp-proto');

  const {
    PeriodicExportingMetricReader
  } = require('@opentelemetry/sdk-metrics');

  // ==========================================
  // VARIABLES PRIVADAS
  // ==========================================

  const tracesEndpoint = process.env.OTEL_TRACES_ENDPOINT;
  const metricsEndpoint = process.env.OTEL_METRICS_ENDPOINT;
  const authHeader = process.env.OTEL_AUTH_HEADER;

  if (!tracesEndpoint || !metricsEndpoint || !authHeader) {
    console.error(JSON.stringify({
      evento: 'OPENTELEMETRY_CONFIG_ERROR',
      mensaje: 'Faltan variables OTLP'
    }));

    process.exit(1);
  }

  // ==========================================
  // EXPORTADOR DE TRAZAS
  // ==========================================

  const traceExporter = new OTLPTraceExporter({
    url: tracesEndpoint,
    headers: {
      Authorization: authHeader
    }
  });

  // ==========================================
  // EXPORTADOR DE METRICAS
  // ==========================================

  const metricExporter = new OTLPMetricExporter({
    url: metricsEndpoint,
    headers: {
      Authorization: authHeader
    }
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,

    // Enviar metricas cada 15 segundos
    exportIntervalMillis: 15000,

    exportTimeoutMillis: 10000
  });

  // ==========================================
  // INICIALIZAR SDK
  // ==========================================

  const sdk = new NodeSDK({
    serviceName: 'devops-control-backend',

    traceExporter,

    metricReaders: [metricReader],

    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false
        }
      })
    ]
  });

  sdk.start();

  console.log(JSON.stringify({
    evento: 'OPENTELEMETRY_INITIALIZED',
    servicio: 'devops-control-backend',
    trazas: 'ENABLED',
    metricas: 'ENABLED',
    intervaloMetricasMs: 15000,
    estado: 'OK'
  }));

  // ==========================================
  // CIERRE CONTROLADO
  // ==========================================

  process.once('SIGTERM', () => {
    Promise.resolve(sdk.shutdown())
      .catch(error => {
        console.error(
          '[OpenTelemetry] Error al cerrar:',
          error.message
        );
      });
  });
}
