
'use strict';

// ============================================
// DEVOPS CONTROL - OPENTELEMETRY
// TRAZAS + METRICAS + LOGS OTLP
// ============================================

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

  const {
    OTLPMetricExporter
  } = require('@opentelemetry/exporter-metrics-otlp-proto');

  const {
    OTLPLogExporter
  } = require('@opentelemetry/exporter-logs-otlp-proto');

  const {
    PeriodicExportingMetricReader
  } = require('@opentelemetry/sdk-metrics');

  const {
    BatchLogRecordProcessor
  } = require('@opentelemetry/sdk-logs');

  // ==========================================
  // CONFIGURACION PRIVADA
  // ==========================================

  const tracesEndpoint = process.env.OTEL_TRACES_ENDPOINT;
  const metricsEndpoint = process.env.OTEL_METRICS_ENDPOINT;
  const logsEndpoint = process.env.OTEL_LOGS_ENDPOINT;
  const authHeader = process.env.OTEL_AUTH_HEADER;

  if (
    !tracesEndpoint ||
    !metricsEndpoint ||
    !logsEndpoint ||
    !authHeader
  ) {
    console.error(JSON.stringify({
      evento: 'OPENTELEMETRY_CONFIG_ERROR',
      mensaje: 'Faltan variables de configuracion OTLP'
    }));

    process.exit(1);
  }

  // ==========================================
  // TRAZAS
  // ==========================================

  const traceExporter = new OTLPTraceExporter({
    url: tracesEndpoint,
    headers: {
      Authorization: authHeader
    }
  });

  // ==========================================
  // METRICAS
  // ==========================================

  const metricExporter = new OTLPMetricExporter({
    url: metricsEndpoint,
    headers: {
      Authorization: authHeader
    }
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15000,
    exportTimeoutMillis: 10000
  });

  // ==========================================
  // LOGS
  // ==========================================

  const logExporter = new OTLPLogExporter({
    url: logsEndpoint,
    headers: {
      Authorization: authHeader,
      'stream-name': 'devops_backend_logs'
    }
  });

  const logProcessor = new BatchLogRecordProcessor({
    exporter: logExporter,
    scheduledDelayMillis: 1000,
    exportTimeoutMillis: 10000
  });

  // ==========================================
  // INICIAR SDK
  // ==========================================

  const sdk = new NodeSDK({
    serviceName: 'devops-control-backend',

    traceExporter,

    metricReaders: [
      metricReader
    ],

    logRecordProcessors: [
      logProcessor
    ],

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
    logs: 'ENABLED',
    estado: 'OK'
  }));

  // ==========================================
  // CIERRE CONTROLADO
  // ==========================================

  process.once('SIGTERM', () => {
    Promise.resolve(sdk.shutdown()).catch(error => {
      console.error(
        '[OpenTelemetry] Error al cerrar:',
        error.message
      );
    });
  });
}
