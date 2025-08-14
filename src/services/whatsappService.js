const express = require('express');
const axios = require('axios');
const router = express.Router();
const pool = require('../config/database');
/**
 * Envía un mensaje de WhatsApp utilizando la API de CallMeBot
 * @param {string} telefono - Número de teléfono del destinatario en formato internacional
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
    
    console.log('Enviando mensaje a WhatsApp...');
    const response = await axios.get(url);
    
    console.log('Respuesta de la API:', response.data);
    
    // Verificar si la respuesta contiene un error
    if (response.data && response.data.includes('ERROR')) {
      throw new Error(`Error de CallMeBot: ${response.data}`);
    }
    
    return {
      success: true,
      message: 'Mensaje enviado correctamente',
      
    };
  } catch (error) {
    //console.error('Error al enviar mensaje de WhatsApp:', error);
    return {
      success: false,
      message: `Error al enviar mensaje: ${error.message}`,
      error: error.message
    };
  }
};
/**
 * Endpoint para enviar un mensaje de WhatsApp
 * POST /api/whatsapp/enviar
 */
router.post('/enviar', async (req, res) => {
  try {
    const { telefono, mensaje, apiKey } = req.body;
    
    if (!telefono || !mensaje || !apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros obligatorios: telefono, mensaje o apiKey'
      });
    }
    
    const resultado = await enviarMensajeWhatsApp(telefono, mensaje, apiKey);
    
    if (resultado.success) {
      return res.status(200).json(resultado);
    } else {
      return res.status(500).json(resultado);
    }
  } catch (error) {
    console.error('Error en endpoint /enviar:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
});
/**
 * Endpoint para enviar un mensaje de servicio asignado
 * POST /api/whatsapp/servicio-asignado
 */
router.post('/servicio-asignado', async (req, res) => {
  try {
    const { id_servicio, id_operador } = req.body;
    
    if (!id_servicio || !id_operador) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros obligatorios: id_servicio o id_operador'
      });
    }
    
    // Obtener datos del servicio
    const [servicios] = await pool.query(
  `SELECT c.*, cl.nombre as nombre_cliente, 
          c.as_telefono as as_telefono  
   FROM cotizaciones c 
   LEFT JOIN servicio cl ON c.id_servicio= cl.id_servicio
   WHERE c.id_servicio = ?`,
  [id_servicio]
);
    if (servicios.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Servicio no encontrado'
      });
    }
    
    const servicio = servicios[0];
    
    // Obtener datos del operador
    const [operadores] = await pool.query(
      'SELECT * FROM operadores WHERE id_operador = ?',
      [id_operador]
    );
    
    if (operadores.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Operador no encontrado'
      });
    }
    
    const operador = operadores[0];
    
    // Verificar que el operador tenga teléfono y API key
    if (!operador.telefono || !operador.apikey_telefono) {
      return res.status(400).json({
        success: false,
        message: 'El operador no tiene configurado un teléfono o API key'
      });
    }
    
    // Crear mensaje

const mensaje = `
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
    // Teléfono: ${servicio.as_telefono || 'No disponible'
    // Enviar mensaje
    const resultado = await enviarMensajeWhatsApp(
      operador.telefono,
      mensaje,
      operador.apikey_telefono
    );
    
    // Registrar el envío del mensaje en la base de datos
    await pool.query(
      `INSERT INTO mensajes_whatsapp 
       (id_cotizacion, id_operador, tipo_mensaje, contenido, estado_envio, fecha_envio) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        id_servicio,
        id_operador,
        'servicio_asignado',
        mensaje,
        resultado.success ? 'enviado' : 'error'
      ]
    );
    
    if (resultado.success) {
      return res.status(200).json(resultado);
    } else {
      return res.status(500).json(resultado);
    }
  } catch (error) {
    console.error('Error en endpoint /servicio-asignado:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud',
      error: error.message
    });
  }
});
// Endpoints similares para otros tipos de mensajes...
module.exports = router;