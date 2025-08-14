import axios from 'axios';
/**
 * Envía un mensaje de WhatsApp utilizando la API de CallMeBot
 * @param {string} telefono - Número de teléfono del destinatario en formato internacional (ej. 5215643683888)
 * @param {string} mensaje - Mensaje a enviar
 * @param {string} apiKey - API key de CallMeBot para el número de teléfono
 * @returns {Promise<Object>} - Resultado de la operación
 */
const enviarMensajeWhatsApp = async (telefono, mensaje, apiKey) => {
  try {
    // Validar parámetros
    if (!telefono || !mensaje || !apiKey) {
      throw new Error('Faltan parámetros obligatorios: telefono, mensaje o apiKey');
    }
    // Configuración de la API CallMeBot
    const CALLMEBOT_API_URL = 'https://api.callmebot.com/whatsapp.php';
    
    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    
    // Construir la URL de la API
    const url = `${CALLMEBOT_API_URL}?phone=${telefono}&text=${mensajeCodificado}&apikey=${apiKey}`;
    
    console.log('Enviando mensaje a WhatsApp...', url);
    
    // Aumentar el tiempo de espera y configurar para que no lance errores en ciertas situaciones
    const response = await axios.get(url, {
      timeout: 30000, // 30 segundos de timeout
      validateStatus: function (status) {
        return status >= 200 && status < 500; // Acepta cualquier estado entre 200-499
      }
    });
    
    console.log('Respuesta de la API:', response.data);
    
    // Verificar si la respuesta contiene un error
    if (response.data && typeof response.data === 'string' && response.data.includes('ERROR')) {
      throw new Error(`Error de CallMeBot: ${response.data}`);
    }
    
    return {
      success: true,
      message: 'Mensaje enviado correctamente',
      data: response.data
    };
  } catch (error) {
    console.error('Error al enviar mensaje de WhatsApp:', error);
    
    let errorMessage = 'Error desconocido';
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Tiempo de espera agotado al intentar enviar el mensaje';
    } else if (error.message.includes('Network Error')) {
      errorMessage = 'Error de red: No se pudo conectar con el servidor de WhatsApp. Verifique su conexión a internet.';
    } else if (error.response) {
      errorMessage = `Error del servidor: ${error.response.data || error.response.statusText}`;
    } else {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: errorMessage,
      error: error
    };
  }
};
/**
 * Crea un mensaje para notificar a un operador sobre un servicio asignado
 * Teléfono: ${servicio.as_telefono || 'No disponible'}
 * @param {Object} servicio - Datos del servicio
 * @param {Object} operador - Datos del operador
 * @returns {string} - Mensaje formateado
 */
const crearMensajeServicioAsignado = (servicio, operador) => {
  return `
🚨 *SERVICIO ASIGNADO* 🚨
Hola ${operador.nombre} ${operador.ap_paterno || ''}, se te ha asignado un nuevo servicio:
📋 *Detalles del Servicio:*
Folio: ${servicio.n_folio || 'Sin folio'}
Tipo: ${servicio.tipo_servicio || 'No especificado'}
Fecha: ${servicio.fecha_creacion?.split('T')[0] || new Date().toISOString().split('T')[0]}
Hora: ${servicio.hora_creacion || new Date().toLocaleTimeString()}
🚗 *Vehículo:*
${servicio.marca || ''} ${servicio.modelo || ''} ${servicio.anio || ''}
Color: ${servicio.color || 'No especificado'}
Placas: ${servicio.placas || 'No especificado'}
👤 *Solicitante:*
Nombre: ${servicio.as_nombre || 'No especificado'}
📍 *Ubicación:*
Origen: ${servicio.direccion_origen || 'No especificado'}
🏁 *Destino:*
${servicio.direccion_destino || 'No especificado'}
Por favor, confirma que has recibido esta notificación respondiendo a este mensaje.
`;
};
/**
 * Crea un mensaje para notificar a un operador sobre el inicio de un servicio
 * Teléfono: ${servicio.as_telefono || 'No disponible'}
 * @param {Object} servicio - Datos del servicio
 * @param {Object} operador - Datos del operador
 * @returns {string} - Mensaje formateado
 */
const crearMensajeInicioServicio = (servicio, operador) => {
  return `
✅ *SERVICIO INICIADO* ✅
${operador.nombre} ${operador.ap_paterno || ''}, el servicio ${servicio.n_folio || 'Sin folio'} ha sido iniciado.
🚗 *Datos del vehículo:*
${servicio.marca || ''} ${servicio.modelo || ''} ${servicio.color || ''}
Placas: ${servicio.placas || 'No especificado'}
👤 *Contacto del solicitante:*
${servicio.as_nombre || 'No especificado'}
Por favor, mantén actualizado al cliente sobre el progreso del servicio.
`;
};
/**
 * Crea un mensaje de recordatorio para un operador sobre un servicio pendiente
 * @param {Object} servicio - Datos del servicio
 * @param {Object} operador - Datos del operador
 * @returns {string} - Mensaje formateado
 */
const crearMensajeRecordatorio = (servicio, operador) => {
  return `
⏰ *RECORDATORIO DE SERVICIO* ⏰
${operador.nombre} ${operador.ap_paterno || ''}, tienes un servicio pendiente:
Folio: ${servicio.n_folio || 'Sin folio'}
Vehículo: ${servicio.marca || ''} ${servicio.modelo || ''} ${servicio.color || ''}
Placas: ${servicio.placas || 'No especificado'}
Origen: ${servicio.direccion_origen || 'No especificado'}
Por favor, confirma si ya estás en camino o si necesitas apoyo.
`;
};
/**
 * Crea un mensaje para notificar a un operador sobre un servicio completado
 * @param {Object} servicio - Datos del servicio
 * @param {Object} operador - Datos del operador
 * @param {number} total - Total final del servicio
 * @returns {string} - Mensaje formateado
 */
const crearMensajeServicioCompletado = (servicio, operador, total = 0) => {
  return `
🏁 *SERVICIO COMPLETADO* 🏁
El servicio ${servicio.n_folio || 'Sin folio'} ha sido marcado como completado.
Detalles:
- Cliente: ${servicio.nombre_cliente || 'No especificado'}
- Vehículo: ${servicio.marca || ''} ${servicio.modelo || ''}
- Placas: ${servicio.placas || 'No especificado'}
Gracias por tu trabajo, ${operador.nombre} ${operador.ap_paterno || ''}.
`;
};
/**
 * Crea un mensaje para notificar a un operador sobre la reasignación de un servicio
 * Teléfono: ${servicio.as_telefono || 'No disponible'} 
 * @param {Object} servicio - Datos del servicio
 * @param {Object} nuevoOperador - Datos del nuevo operador
 * @returns {string} - Mensaje formateado
 */
const crearMensajeReasignacion = (servicio, nuevoOperador) => {
  return `
🔄 *SERVICIO REASIGNADO* 🔄
Hola ${nuevoOperador.nombre} ${nuevoOperador.ap_paterno || ''}, se te ha reasignado el servicio ${servicio.n_folio || 'Sin folio'} que estaba asignado previamente a otro operador.
📋 *Detalles del Servicio:*
Tipo: ${servicio.tipo_servicio || 'No especificado'}
Vehículo: ${servicio.marca || ''} ${servicio.modelo || ''} ${servicio.color || ''}
Placas: ${servicio.placas || 'No especificado'}
👤 *Solicitante:*
Nombre: ${servicio.as_nombre || 'No especificado'}
📍 *Ubicación:*
Origen: ${servicio.direccion_origen || 'No especificado'}
Destino: ${servicio.direccion_destino || 'No especificado'}
Por favor, confirma que has recibido esta notificación y dirígete al lugar lo antes posible.
`;
};
/**
 * Crea un mensaje para notificar a un operador sobre la cancelación de un servicio
 * @param {Object} servicio - Datos del servicio
 * @param {Object} operador - Datos del operador
 * @returns {string} - Mensaje formateado
 */
const crearMensajeCancelacion = (servicio, operador) => {
  return `
❌ *SERVICIO CANCELADO* ❌
${operador.nombre} ${operador.ap_paterno || ''}, el servicio ${servicio.n_folio || 'Sin folio'} ha sido cancelado.
Detalles:
- Vehículo: ${servicio.marca || ''} ${servicio.modelo || ''} ${servicio.color || ''}
- Placas: ${servicio.placas || 'No especificado'}
- Origen: ${servicio.direccion_origen || 'No especificado'}
No es necesario que acudas al lugar. Si ya estabas en camino, por favor regresa a tu base.
`;
};
// Exportar funciones para uso en otros archivos
export {
  enviarMensajeWhatsApp,
  crearMensajeServicioAsignado,
  crearMensajeInicioServicio,
  crearMensajeRecordatorio,
  crearMensajeReasignacion,
  crearMensajeServicioCompletado,
  crearMensajeCancelacion
};