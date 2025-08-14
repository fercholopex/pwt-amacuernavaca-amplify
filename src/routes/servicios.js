const express = require('express'); 
const router = express.Router(); 
const path = require('path'); 
const pool = require('../config/database'); 
const { generarPDF } = require('../utils/pdfUtils'); 
// Ruta para crear nuevo servicio 
router.post('/', async (req, res) => { 
    console.log('Datos recibidos:', req.body); 
    const {  
        id_cliente,  
        n_folio,  
        as_nombre,  
        ap_paterno,  
        ap_materno,  
        as_rfc,  
        marca,  
        modelo,  
        color,  
        placas,  
        fecha,  
        direccion_origen,  
        direccion_destino, 
        as_telefono
    } = req.body; 
    // Validación de campos requeridos 
    if (!id_cliente || !as_nombre || !ap_paterno || !ap_materno || !as_rfc || !as_telefono|| !marca |
        !modelo || !color || !placas || !fecha || !direccion_origen || !direccion_destino) { 
        return res.status(400).json({  
            success: false, 
            message: 'Todos los campos son obligatorios.'  
        }); 
    } 
    let connection; 
    try { 
        connection = await pool.getConnection(); 
        await connection.beginTransaction(); 
        // 1. Insertar el servicio 
        const [serviceResult] = await connection.query( 
            `INSERT INTO servicios ( 
                id_cliente, n_folio, as_nombre, ap_paterno, ap_materno, as_rfc,  
                marca, modelo, color, placas, fecha, direccion_origen, direccion_destino, as_telefono
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [id_cliente, n_folio, as_nombre, ap_paterno, ap_materno, as_rfc,  
             marca, modelo, color, placas, fecha, direccion_origen, direccion_destino, as_telefono]
        ); 
        const id_servicio = serviceResult.insertId;
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Servicio creado exitosamente',
            id_servicio: id_servicio
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear el servicio',
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});
// Obtener un servicio específico 
router.get('/:id', async (req, res) => { 
    try { 
        const [servicio] = await pool.query( 
            'SELECT * FROM servicios WHERE id_servicio = ?', 
            [req.params.id] 
        ); 
        if (servicio.length === 0) { 
            return res.status(404).json({ 
                success: false, 
                message: 'Servicio no encontrado' 
            }); 
        } 
        res.json({ 
            success: true, 
            data: servicio[0] 
        }); 
    } catch (error) { 
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener el servicio', 
            error: error.message 
        }); 
    } 
});
// Generar PDF para un servicio específico
router.get('/pdf/:id', async (req, res) => {
    try {
        // Obtener datos del servicio
        const [servicio] = await pool.query(
            'SELECT s.*, c.nombre_cliente, c.tipo_convenio FROM servicios s ' +
            'LEFT JOIN clientes c ON s.id_cliente = c.id_cliente ' +
            'WHERE s.id_servicio = ?',
            [req.params.id]
        );
        if (servicio.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Servicio no encontrado'
            });
        }
        // Generar el PDF
        const pdfPath = await generarPDF(servicio[0]);
        
        // Configurar headers para descarga
        const fileName = `servicio_${req.params.id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        // Enviar archivo
        const absolutePdfPath = path.join(__dirname, '..', 'public', pdfPath);
        res.sendFile(absolutePdfPath, (err) => {
            if (err) {
                console.error('Error al enviar el archivo:', err);
                res.status(500).json({
                    success: false,
                    message: 'Error al enviar el PDF',
                    error: err.message
                });
            }
        });
    } catch (error) {
        console.error('Error al generar PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar el PDF',
            error: error.message
        });
    }
});
module.exports = router; 