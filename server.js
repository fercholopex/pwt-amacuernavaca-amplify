const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./src/config/database');
const config = require('./src/config/config');
const whatsappRoutes = require('./src/services/whatsappService');
// Inicializar express
const app = express();
const port = config.port || 5000;
// Middleware de logging
const loggerMiddleware = (req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
};
// Configuración de CORS
const corsOptions = {
    origin: 'https://main.ddwo4j04n8ass.amplifyapp.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};
// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(loggerMiddleware);
// Verificar conexión a la base de datos
pool.query('SELECT NOW()')
    .then(() => console.log('Conexión a MySQL establecida correctamente'))
    .catch(err => {
        console.error('Error al conectar con MySQL:', err);
        process.exit(1);
    });
// Rutas
app.use('/api/catalogos', require('./src/routes/catalogos'));
app.use('/api/servicios', require('./src/routes/servicios'));
app.use('/api/cotizaciones', require('./src/routes/cotizaciones'));
app.use('/api/precotizaciones', require('./src/routes/precotizaciones'));

app.use('/api/whatsapp', require('./src/services/whatsappService'));


// Middleware para manejar errores
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
    });
});
// Middleware para manejar rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});
// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
    console.error('Error no capturado:', err);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada:', reason);
});
// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
    // console.log('Modo:', process.env.NODE_ENV || 'development');
});
// Manejo de señales de terminación
process.on('SIGTERM', () => {
    console.log('Recibida señal SIGTERM. Cerrando servidor...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('Recibida señal SIGINT. Cerrando servidor...');
    process.exit(0);
});
module.exports = app;
