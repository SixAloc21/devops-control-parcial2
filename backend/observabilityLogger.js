
'use strict';

// ============================================
// DEVOPS CONTROL - LOGGER ESTRUCTURADO
// CONSOLA DOCKER + OPENTELEMETRY
// ============================================

const { logs } = require('@opentelemetry/api-logs');

const logger = logs.getLogger(
  'devops-control-backend',
  '1.0.0'
);

const enabled =
  process.env.OTEL_ENABLED === 'true' &&
  process.env.NODE_ENV !== 'test';

function registrarEvento(datos, esError = false) {
  // Mantener los registros en Docker
  const registro = {
    ...datos,
    timestamp: datos.timestamp || new Date().toISOString()
  };

  const mensaje = JSON.stringify(registro);

  if (esError) {
    console.error(mensaje);
  } else {
    console.log(mensaje);
  }

  // Evitar exportacion durante las pruebas
  if (!enabled) {
    return;
  }

  // No exportar contraseñas, tokens ni cuerpos HTTP.
  const atributos = {};

  const camposPermitidos = [
    'evento',
    'tipo',
    'metodo',
    'endpoint',
    'statusCode',
    'duracionMs',
    'resultado',
    'accion'
  ];

  for (const campo of camposPermitidos) {
    const valor = registro[campo];

    if (
      typeof valor === 'string' ||
      typeof valor === 'number' ||
      typeof valor === 'boolean'
    ) {
      atributos[campo] = valor;
    }
  }

  logger.emit({
    severityNumber: esError ? 17 : 9,
    severityText: esError ? 'ERROR' : 'INFO',
    body: esError
      ? 'Error de aplicacion'
      : 'Peticion HTTP procesada',
    attributes: atributos
  });
}

module.exports = {
  registrarEvento
};
