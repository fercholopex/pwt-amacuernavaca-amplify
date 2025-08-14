const express = require('express'); 
const router = express.Router(); 
const pool = require('../config/database'); 
// Endpoint para obtener el último ID de servicio 
router.get('/ultimo-id-servicio', async (req, res) => { 
    let connection; 
    try { 
        connection = await pool.getConnection(); 
        const [result] = await connection.query( 
            'SELECT MAX(id_servicio) as ultimoId FROM precotizados' 
        ); 
        res.json({ ultimoId: result[0].ultimoId || 0 }); 
    } catch (error) { 
        console.error('Error al obtener último ID:', error); 
        res.status(500).json({  
            error: 'Error al obtener último ID de servicio', 
            details: error.message  
        }); 
    } finally { 
        if (connection) { 
            connection.release(); 
        } 
    } 
}); 
// Crear nueva precotización 
router.post('/', async (req, res) => { 
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const { 
            id_cliente,
            id_servicio,
            tipo_servicio,
            detalle_servicio,
            km,
            costo_km,
            km_extra,
            costo_km_extra,
            banderazo,
            costo_adicional,
            costo_asegurado,
            num_casetas,
            costo_casetas,
            total,
            porcentaje_iva,
            total_con_iva
        } = req.body;
        // Verificar si ya existe una precotización para este servicio
        const [existingPrecotizacion] = await connection.query(
            'SELECT id_precotizado FROM precotizados WHERE id_servicio = ?',
            [id_servicio]
        );
        if (existingPrecotizacion.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Ya existe una precotización para este servicio'
            });
        }
        // Insertar precotización
        const [precotizacionResult] = await connection.query(
            `INSERT INTO precotizados (
                id_cliente,
                id_servicio,
                tipo_servicio,
                detalle_servicio,
                km,
                costo_km,
                km_extra,
                costo_km_extra,
                banderazo,
                costo_adicional,
                costo_asegurado,
                num_casetas,
                costo_casetas,
                total,
                porcentaje_iva,
                total_con_iva
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id_cliente,
                id_servicio,
                tipo_servicio,
                detalle_servicio,
                km,
                costo_km,
                km_extra,
                costo_km_extra,
                banderazo,
                costo_adicional,
                costo_asegurado,
                num_casetas,
                costo_casetas,
                total,
                porcentaje_iva,
                total_con_iva
            ]
        );
        // Crear cotización automáticamente
        const [cotizacionResult] = await connection.query(
            `INSERT INTO cotizaciones (
                id_precotizado,
                id_cliente,
                id_servicio,
                tipo_servicio,
                detalle_servicio,
                km,
                costo_km,
                km_extra,
                costo_km_extra,
                banderazo,
                costo_adicional,
                costo_asegurado,
                num_casetas,
                costo_casetas,
                total,
                porcentaje_iva,
                total_con_iva,
                estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                precotizacionResult.insertId,
                id_cliente,
                id_servicio,
                tipo_servicio,
                detalle_servicio,
                km,
                costo_km,
                km_extra,
                costo_km_extra,
                banderazo,
                costo_adicional,
                costo_asegurado,
                num_casetas,
                costo_casetas,
                total,
                porcentaje_iva,
                total_con_iva,
                'Pendiente'
            ]
        );
        
        await connection.commit();
        res.json({
            success: true,
            message: 'Precotización y cotización creadas exitosamente',
            id_precotizado: precotizacionResult.insertId,
            id_cotizacion: cotizacionResult.insertId
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la precotización',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});
module.exports = router;