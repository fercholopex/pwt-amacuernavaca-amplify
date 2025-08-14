const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const cors = require('cors');
// Middleware
router.use(cors());
router.use(express.json());
// Logging middleware
router.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});
// Verificar conexión
pool.query('SELECT NOW()')
    .then(() => console.log('Conexión a MySQL establecida'))
    .catch(err => console.error('Error al conectar con MySQL:', err));
// Obtener todas las cotizaciones
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id_cotizacion,
                c.id_precotizado,
                c.id_cliente,
                c.id_servicio,
                c.fecha_cotizacion,
                c.tipo_servicio,
                c.detalle_servicio,
                c.km,
                c.costo_km,
                c.km_extra,
                c.costo_km_extra,
                c.banderazo,
                c.costo_adicional,
                c.costo_asegurado,
                c.num_casetas,
                c.costo_casetas,
                c.total,
                c.porcentaje_iva,
                c.total_con_iva,
                c.estado,
                c.fecha_modificacion,
                c.id_operador as operador_id,
                o.nombre AS nombre_operador,
                o.telefono AS telefono_operador,
                cl.nombre_cliente,
                cl.tipo_convenio,
                s.n_folio,
                s.id_cliente,
                s.as_nombre,
                s.ap_paterno,
                s.ap_materno,
                s.as_rfc,
                s.as_telefono,
                s.marca,
                s.modelo,
                s.color,
                s.placas,
                s.fecha,
                s.direccion_origen,
                s.direccion_destino
            FROM cotizaciones c
            LEFT JOIN operadores o ON c.id_operador = o.id_operador
            LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
            LEFT JOIN servicios s ON c.id_servicio = s.id_servicio
            ORDER BY c.fecha_cotizacion DESC;
        `;
        console.log('Ejecutando consulta:', query);
        const [rows] = await pool.query(query);
        
        // Formatear los datos antes de enviarlos
        const cotizacionesFormateadas = rows.map(cotizacion => ({
            id_cotizacion: cotizacion.id_cotizacion,
            id_precotizado: cotizacion.id_precotizado,
            id_cliente: cotizacion.id_cliente,
            id_servicio: cotizacion.id_servicio,
            fecha_cotizacion: cotizacion.fecha_cotizacion,
            tipo_servicio: cotizacion.tipo_servicio,
            detalle_servicio: cotizacion.detalle_servicio,
            km: cotizacion.km,
            costo_km: cotizacion.costo_km,
            km_extra: cotizacion.km_extra,
            costo_km_extra: cotizacion.costo_km_extra,
            banderazo: cotizacion.banderazo,
            costo_adicional: cotizacion.costo_adicional,
            costo_asegurado: cotizacion.costo_asegurado,
            num_casetas: cotizacion.num_casetas,
            costo_casetas: cotizacion.costo_casetas,
            total: cotizacion.total,
            porcentaje_iva: cotizacion.porcentaje_iva,
            total_con_iva: cotizacion.total_con_iva,
            estado: cotizacion.estado,
            operador_id: cotizacion.operador_id,
            usuario_creacion: cotizacion.usuario_creacion || 'Sistema',
            fecha_modificacion: cotizacion.fecha_modificacion,
            nombre_operador: cotizacion.nombre_operador || 'No asignado',
            telefono_operador: cotizacion.telefono_operador || 'No disponible',
            nombre_cliente: cotizacion.nombre_cliente,
            tipo_convenio: cotizacion.tipo_convenio,
            n_folio: cotizacion.n_folio,
            as_nombre: cotizacion.as_nombre,
            ap_paterno: cotizacion.ap_paterno,
            ap_materno: cotizacion.ap_materno,
            as_rfc: cotizacion.as_rfc,
            marca: cotizacion.marca,
            modelo: cotizacion.modelo,
            color: cotizacion.color,
            placas: cotizacion.placas,
            fecha: cotizacion.fecha,
            direccion_origen: cotizacion.direccion_origen,
            direccion_destino: cotizacion.direccion_destino,
            n_poliza: '' // Valor por defecto
        }));
        
        res.json(cotizacionesFormateadas);
    } catch (error) {
        console.error('Error detallado:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al obtener las cotizaciones',
            error: error.message
        });
    }
});
// Obtener una cotización específica
router.get('/:id', async (req, res) => {
    try {
        const query = `
            SELECT 
                c.*,
                cl.nombre as cliente_nombre,
                cl.tipo_convenio,
                o.nombre as operador_nombre,
                o.ap_paterno as operador_ap_paterno,
                o.telefono as operador_telefono
            FROM cotizaciones c
            LEFT JOIN clientes cl ON c.id_cliente = cl.id_cliente
            LEFT JOIN operadores o ON c.id_operador = o.id_operador
            LEFT JOIN servicios s ON c.id_servicio = s.id_servicio
            WHERE c.id_cotizacion = ? AND c.activo = true
        `;
        const [rows] = await pool.query(query, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                mensaje: 'Cotización no encontrada'
            });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al obtener la cotización',
            error: error.message
        });
    }
});
// Actualizar cotización
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, id_operador } = req.body;
        console.log('Datos recibidos:', { id, estado, id_operador });
        
        const query = `
            UPDATE cotizaciones 
            SET 
                estado = COALESCE(?, estado),
                id_operador = COALESCE(?, id_operador),
                fecha_modificacion = CURRENT_TIMESTAMP
            WHERE id_cotizacion = ?
        `;
        
        const [result] = await pool.query(query, [estado, id_operador, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                mensaje: `Cotización con ID ${id} no encontrada`
            });
        }
        
        // Obtener la cotización actualizada
        const [updatedRow] = await pool.query(
            'SELECT * FROM cotizaciones WHERE id_cotizacion = ?',
            [id]
        );
        
        res.json({
            success: true,
            mensaje: 'Cotización actualizada correctamente',
            data: updatedRow[0] || {}
        });
    } catch (error) {
        console.error('Error en actualización:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al actualizar la cotización',
            error: error.message
        });
    }
});
// Actualizar costos
router.put('/:id/costos', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            costo_adicional,
            costo_asegurado,
            num_casetas,
            costo_casetas
        } = req.body;
        
        console.log('Datos recibidos en actualizar costos:', {
            id,
            costo_adicional,
            costo_asegurado,
            num_casetas,
            costo_casetas
        });
        
        // Convertir a números para evitar problemas
        const costoAdicionalNum = parseFloat(costo_adicional) || 0;
        const costoAseguradoNum = parseFloat(costo_asegurado) || 0;
        const numCasetasNum = parseInt(num_casetas) || 0;
        const costoCasetasNum = parseFloat(costo_casetas) || 0;
        
        const query = `
            UPDATE cotizaciones 
            SET 
                costo_adicional = ?,
                costo_asegurado = ?,
                num_casetas = ?,
                costo_casetas = ?,
                fecha_modificacion = CURRENT_TIMESTAMP
            WHERE id_cotizacion = ?
        `;
        
        const [result] = await pool.query(query, [
            costoAdicionalNum,
            costoAseguradoNum,
            numCasetasNum,
            costoCasetasNum,
            id
        ]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                mensaje: 'Cotización no encontrada'
            });
        }
        
        // Simplificar la respuesta para evitar problemas
        res.json({
            success: true,
            mensaje: 'Costos actualizados correctamente'
        });
    } catch (error) {
        console.error('Error completo en costos:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al actualizar los costos',
            error: error.message || 'Error desconocido'
        });
    }
});
// Eliminar cotización (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const query = `
            UPDATE cotizaciones 
            SET activo = false 
            WHERE id_cotizacion = ?
        `;
        
        const [result] = await pool.query(query, [req.params.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                mensaje: 'Cotización no encontrada'
            });
        }
        
        res.json({
            success: true,
            mensaje: 'Cotización eliminada correctamente'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al eliminar la cotización',
            error: error.message
        });
    }
});
// Actualizar póliza
router.put('/:id/poliza', async (req, res) => {
    try {
        const { id } = req.params;
        const { n_poliza } = req.body;
        
        console.log('Datos recibidos en actualizar póliza:', {
            id,
            n_poliza
        });
        
        if (!n_poliza) {
            return res.status(400).json({
                success: false,
                mensaje: 'El número de póliza es requerido'
            });
        }
        
        // Primero obtenemos el id_servicio de la cotización
        const [cotizacion] = await pool.query(
            'SELECT id_servicio FROM cotizaciones WHERE id_cotizacion = ?',
            [id]
        );
        
        if (cotizacion.length === 0 || !cotizacion[0].id_servicio) {
            return res.status(404).json({
                success: false,
                mensaje: 'Cotización no encontrada o no tiene servicio asociado'
            });
        }
        
        const id_servicio = cotizacion[0].id_servicio;
        
        // Verificar si la columna n_poliza existe en la tabla servicios
        try {
            await pool.query(`
                ALTER TABLE servicios ADD COLUMN IF NOT EXISTS n_poliza VARCHAR(100) NULL
            `);
        } catch (error) {
            console.error('Error al verificar/crear columna n_poliza:', error);
        }
        
        // Actualizamos el número de póliza en la tabla servicios
        const query = `
            UPDATE servicios
            SET n_poliza = ?
            WHERE id_servicio = ?
        `;
        
        const [result] = await pool.query(query, [n_poliza, id_servicio]);
        
        // Simplificar la respuesta para evitar problemas
        res.json({
            success: true,
            mensaje: 'Número de póliza guardado correctamente'
        });
    } catch (error) {
        console.error('Error completo en póliza:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al guardar el número de póliza',
            error: error.message || 'Error desconocido'
        });
    }
});
// Reasignar operador
router.put('/:id/reasignar', async (req, res) => {
    try {
        const { id } = req.params;
        const { id_operador } = req.body;
        
        if (!id_operador) {
            return res.status(400).json({
                success: false,
                mensaje: 'El ID del operador es requerido'
            });
        }
        
        const query = `
            UPDATE cotizaciones 
            SET 
                id_operador = ?,
                estado = 'Asignado',
                fecha_modificacion = CURRENT_TIMESTAMP,
                fecha_asignacion = CURRENT_TIMESTAMP
            WHERE id_cotizacion = ?
        `;
        
        const [result] = await pool.query(query, [id_operador, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                mensaje: 'Cotización no encontrada'
            });
        }
        
        res.json({
            success: true,
            mensaje: 'Operador reasignado correctamente'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al reasignar operador',
            error: error.message
        });
    }
});
// Completar servicio
router.put('/:id/completar', async (req, res) => {
    try {
        const { id } = req.params;
        const { total_final } = req.body;
        
        const query = `
            UPDATE cotizaciones 
            SET 
                estado = 'Completado',
                total_con_iva = ?,
                fecha_modificacion = CURRENT_TIMESTAMP,
                fecha_completado = CURRENT_TIMESTAMP
            WHERE id_cotizacion = ?
        `;
        
        const [result] = await pool.query(query, [total_final || null, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                mensaje: 'Cotización no encontrada'
            });
        }
        
        res.json({
            success: true,
            mensaje: 'Servicio completado correctamente'
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error al completar el servicio',
            error: error.message
        });
    }
});
module.exports = router;