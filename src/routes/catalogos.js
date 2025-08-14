const express = require('express');
const router = express.Router();
const pool = require('../config/database');
// ========== OPERADORES ROUTES ==========
// Obtener todos los operadores activos
router.get('/operadores', async (req, res) => {
    try {
        const busqueda = req.query.busqueda || '';
        let query = `
            SELECT o.*, 
                   g.nombre as nombre_grua 
            FROM operadores o 
            LEFT JOIN gruas g ON o.id_grua = g.id_grua 
            WHERE o.activo = 1`;
        
        if (busqueda) {
            query += ` AND (o.nombre LIKE ? OR o.ap_paterno LIKE ? OR o.telefono LIKE ?)`;
        }
        
        const [results] = await pool.query(
            query,
            busqueda ? [`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`] : []
        );
        
        console.log('Operadores:', results);
        res.json(results);
    } catch (err) {
        console.error('Error al obtener operadores:', err.message);
        res.status(500).json({ 
            message: 'Error al obtener operadores', 
            error: err.message 
        });
    }
});
// Crear nuevo operador
router.post('/operadores', async (req, res) => {
    const { nombre, ap_paterno, ap_materno, telefono, apikey_telefono, rol, turno } = req.body;
    console.log('Datos recibidos:', req.body);
    // Formato para CallMeBot: solo los dígitos
    const telefonoFormateado = telefono.replace(/\D/g, '');
    try {
        const [result] = await pool.query(
            'INSERT INTO operadores (nombre, ap_paterno, ap_materno, telefono, apikey_telefono, rol, turno) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, ap_paterno, ap_materno, telefonoFormateado, apikey_telefono, rol, turno]
        );
        res.json({ 
            message: 'Operador registrado exitosamente', 
            id: result.insertId 
        });
    } catch (err) {
        console.error('Error al registrar operador:', err.message);
        res.status(500).json({ 
            message: 'Error al registrar operador', 
            error: err.message 
        });
    }
});
// Actualizar operador
router.put('/operadores/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, ap_paterno, ap_materno, telefono, apikey_telefono, rol, turno } = req.body;
    console.log('Datos de actualización recibidos:', req.body);
    // Formato para CallMeBot: solo los dígitos
    const telefonoFormateado = telefono.replace(/\D/g, '');
    try {
        const [result] = await pool.query(
            'UPDATE operadores SET nombre = ?, ap_paterno = ?, ap_materno = ?, telefono = ?, apikey_telefono = ?, rol = ?, turno = ? WHERE id_operador = ?',
            [nombre, ap_paterno, ap_materno, telefonoFormateado, apikey_telefono, rol, turno, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Operador no encontrado' });
        }
        res.json({ message: 'Operador actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar operador:', err.message);
        res.status(500).json({ 
            message: 'Error al actualizar operador', 
            error: err.message 
        });
    }
});
// Eliminar operador (soft delete)
router.delete('/operadores/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Marcar el operador como inactivo en lugar de eliminarlo
        const [result] = await pool.query(
            'UPDATE operadores SET activo = 0 WHERE id_operador = ?',
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Operador no encontrado' });
        }
        res.json({ message: 'Operador eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar operador:', err.message);
        res.status(500).json({ 
            message: 'Error al eliminar operador', 
            error: err.message 
        });
    }
});
// ========== GRUAS ROUTES ==========
// Obtener todas las grúas con información de operadores
router.get('/gruas', async (req, res) => {
    try {
        const busqueda = req.query.busqueda || '';
        let query = `
            SELECT g.*, 
                   o.id_operador,
                   CONCAT(o.nombre, ' ', o.ap_paterno) as operador_nombre,
                   o.telefono as operador_telefono,
                   o.apikey_telefono as operador_apikey
            FROM gruas g 
            LEFT JOIN operadores o ON g.id_grua = o.id_grua
            WHERE 1=1
        `;
        
        if (busqueda) {
            query += ` AND (g.nombre LIKE ? OR g.marca LIKE ? OR g.placas LIKE ?)`;
        }
        
        const [results] = await pool.query(
            query,
            busqueda ? [`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`] : []
        );
        
        res.json(results);
    } catch (err) {
        console.error('Error al obtener grúas:', err.message);
        res.status(500).json({ 
            message: 'Error al obtener grúas', 
            error: err.message 
        });
    }
});
// Crear nueva grúa
router.post('/gruas', async (req, res) => {
    const { 
        nombre, marca, modelo, placas, 
        num_economico, estado_emplacado, observaciones 
    } = req.body;
    try {
        const [result] = await pool.query(
            `INSERT INTO gruas (
                nombre, marca, modelo, placas, 
                num_economico, estado_emplacado, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nombre, marca, modelo, placas, 
             num_economico, estado_emplacado, observaciones]
        );
        res.json({ 
            message: 'Grúa registrada exitosamente', 
            id: result.insertId 
        });
    } catch (err) {
        console.error('Error al registrar grúa:', err.message);
        res.status(500).json({ 
            message: 'Error al registrar grúa', 
            error: err.message 
        });
    }
});
// Actualizar grúa
router.put('/gruas/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        nombre, marca, modelo, placas, 
        num_economico, estado_emplacado, observaciones 
    } = req.body;
    try {
        // Primero obtenemos los datos actuales de la grúa
        const [currentGrua] = await pool.query('SELECT * FROM gruas WHERE id_grua = ?', [id]);
        if (currentGrua.length === 0) {
            return res.status(404).json({ message: 'Grúa no encontrada' });
        }
        // Mezclamos los datos actuales con los nuevos datos
        const gruaData = { 
            nombre: nombre || currentGrua[0].nombre,
            marca: marca || currentGrua[0].marca,
            modelo: modelo || currentGrua[0].modelo,
            placas: placas || currentGrua[0].placas,
            num_economico: num_economico || currentGrua[0].num_economico,
            estado_emplacado: estado_emplacado || currentGrua[0].estado_emplacado,
            observaciones: observaciones !== undefined ? observaciones : currentGrua[0].observaciones
        };
        const [result] = await pool.query(
            `UPDATE gruas SET 
                nombre = ?, marca = ?, modelo = ?, 
                placas = ?, num_economico = ?, estado_emplacado = ?, 
                observaciones = ? 
            WHERE id_grua = ?`,
            [
                gruaData.nombre, 
                gruaData.marca, 
                gruaData.modelo, 
                gruaData.placas, 
                gruaData.num_economico, 
                gruaData.estado_emplacado, 
                gruaData.observaciones, 
                id
            ]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Grúa no encontrada' });
        }
        res.json({ message: 'Grúa actualizada exitosamente' });
    } catch (err) {
        console.error('Error al actualizar grúa:', err.message);
        res.status(500).json({ 
            message: 'Error al actualizar grúa', 
            error: err.message 
        });
    }
});
// Eliminar grúa (hard delete)
router.delete('/gruas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Primero liberamos cualquier operador que tenga asignada esta grúa
        await pool.query(
            'UPDATE operadores SET id_grua = NULL WHERE id_grua = ?',
            [id]
        );
        
        // Luego eliminamos la grúa
        const [result] = await pool.query(
            'DELETE FROM gruas WHERE id_grua = ?',
            [id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Grúa no encontrada' });
        }
        
        res.json({ message: 'Grúa eliminada exitosamente' });
    } catch (err) {
        console.error('Error al eliminar grúa:', err.message);
        res.status(500).json({ 
            message: 'Error al eliminar grúa', 
            error: err.message 
        });
    }
});
// ========== ASIGNACIONES ROUTES ==========
// Ruta para asignar operador a grúa
router.post('/asignaciones', async (req, res) => {
    const { id_operador, id_grua } = req.body;
    console.log('Datos de asignación recibidos:', req.body);
    
    if (!id_operador || !id_grua) {
        return res.status(400).json({ 
            message: 'Se requieren id_operador e id_grua para realizar la asignación' 
        });
    }
    
    try {
        // Iniciamos una transacción para asegurar consistencia
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Verificamos que el operador exista
            const [operadorCheck] = await connection.query(
                'SELECT * FROM operadores WHERE id_operador = ?',
                [id_operador]
            );
            
            if (operadorCheck.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Operador no encontrado' });
            }
            
            // Verificamos que la grúa exista
            const [gruaCheck] = await connection.query(
                'SELECT * FROM gruas WHERE id_grua = ?',
                [id_grua]
            );
            
            if (gruaCheck.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'Grúa no encontrada' });
            }
            
            // Liberamos la grúa de cualquier operador que la tuviera asignada
            await connection.query(
                'UPDATE operadores SET id_grua = NULL WHERE id_grua = ?',
                [id_grua]
            );
            
            // Asignamos la grúa al operador
            await connection.query(
                'UPDATE operadores SET id_grua = ? WHERE id_operador = ?',
                [id_grua, id_operador]
            );
            
            await connection.commit();
            
            res.json({ 
                message: 'Operador asignado exitosamente a la grúa',
                operador: operadorCheck[0].nombre + ' ' + operadorCheck[0].ap_paterno,
                id_grua: id_grua
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('Error al asignar operador:', err);
        res.status(500).json({ 
            message: 'Error al asignar operador', 
            error: err.message 
        });
    }
});
// Ruta para desasignar operador de grúa
router.post('/desasignaciones', async (req, res) => {
    const { id_grua } = req.body;
    console.log('Datos de desasignación recibidos:', req.body);
    
    if (!id_grua) {
        return res.status(400).json({ message: 'Se requiere id_grua para desasignar' });
    }
    
    try {
        // Desasignamos la grúa de cualquier operador que la tenga
        const [result] = await pool.query(
            'UPDATE operadores SET id_grua = NULL WHERE id_grua = ?',
            [id_grua]
        );
        
        res.json({ 
            message: 'Operador desasignado exitosamente de la grúa',
            id_grua: id_grua,
            operadoresActualizados: result.affectedRows
        });
    } catch (err) {
        console.error('Error al desasignar operador:', err);
        res.status(500).json({ 
            message: 'Error al desasignar operador', 
            error: err.message 
        });
    }
});
// ========== CLIENTES ROUTES ==========
// Obtener todos los clientes
router.get('/clientes', async (req, res) => {
    try {
        const busqueda = req.query.busqueda || '';
        let query = 'SELECT * FROM clientes WHERE 1=1';
        if (busqueda) {
            query += ` AND (id_cliente LIKE ? OR nombre_cliente LIKE ? OR tipo_convenio LIKE ?)`;
        }
        const [results] = await pool.query(
            query,
            busqueda ? [`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`] : []
        );
        res.json(results);
    } catch (err) {
        console.error('Error al obtener clientes:', err.message);
        res.status(500).json({ 
            message: 'Error al obtener clientes', 
            error: err.message 
        });
    }
});
// Crear nuevo cliente
router.post('/clientes', async (req, res) => {
    const { id_cliente, nombre_cliente, tipo_convenio, banderazo, costokm, tipo_servicio, descripcion } = req.body;
    console.log('Datos de cliente recibidos:', req.body);
    try {
        const [result] = await pool.query(
            'INSERT INTO clientes (id_cliente, nombre_cliente, tipo_convenio, banderazo, costokm, tipo_servicio, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id_cliente, nombre_cliente, tipo_convenio, banderazo, costokm, tipo_servicio, descripcion]
        );
        res.json({ 
            message: 'Cliente registrado exitosamente'
        });
    } catch (err) {
        console.error('Error al registrar cliente:', err.message);
        res.status(500).json({ 
            message: 'Error al registrar cliente', 
            error: err.message 
        });
    }
});
// Actualizar cliente
router.put('/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre_cliente, tipo_convenio, banderazo, costokm, tipo_servicio, descripcion } = req.body;
    console.log('Datos de actualización de cliente recibidos:', req.body);
    try {
        const [result] = await pool.query(
            'UPDATE clientes SET nombre_cliente = ?, tipo_convenio = ?, banderazo = ?, costokm = ?, tipo_servicio = ?, descripcion = ? WHERE id_cliente = ?',
            [nombre_cliente, tipo_convenio, banderazo, costokm, tipo_servicio, descripcion, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.json({ message: 'Cliente actualizado exitosamente' });
    } catch (err) {
        console.error('Error al actualizar cliente:', err.message);
        res.status(500).json({ 
            message: 'Error al actualizar cliente', 
            error: err.message 
        });
    }
});
// Eliminar cliente (hard delete)
router.delete('/clientes/:id', async (req, res) => {
    const { id } = req.params;
    console.log('Eliminando cliente con ID:', id);
    try {
        const [result] = await pool.query(
            'DELETE FROM clientes WHERE id_cliente = ?',
            [id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.json({ message: 'Cliente eliminado exitosamente' });
    } catch (err) {
        console.error('Error al eliminar cliente:', err.message);
        res.status(500).json({ 
            message: 'Error al eliminar cliente', 
            error: err.message 
        });
    }
});
// Obtener cliente por ID
router.get('/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Buscando cliente con ID:', id);
        const [results] = await pool.query(
            'SELECT id_cliente, nombre_cliente, tipo_convenio, banderazo, costokm, tipo_servicio, descripcion FROM clientes WHERE id_cliente = ?',
            [id]
        );
        if (results.length === 0) {
            return res.status(404).json({ 
                message: 'Cliente no encontrado' 
            });
        }
        res.json(results[0]);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).json({ 
            message: 'Error al obtener datos del cliente',
            error: error.message 
        });
    }
});
module.exports = router;