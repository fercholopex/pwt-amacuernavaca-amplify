const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
// Definir el directorio para los acuses
const directorioAcuses = path.join(__dirname, '..', 'public', 'acuses');
// Asegurar que el directorio existe
if (!fs.existsSync(directorioAcuses)) {
    fs.mkdirSync(directorioAcuses, { recursive: true });
}
const generarPDF = async (datos, user = {}) => {
    // Validación inicial de datos
    if (!datos) {
        console.error('No se proporcionaron datos');
        throw new Error('No se proporcionaron datos para generar el PDF');
    }
    if (!datos.id_cliente || !datos.id_servicio) {
        console.error('Datos incompletos:', datos);
        throw new Error('Datos incompletos para generar el PDF: falta id_cliente o id_servicio');
    }
    // Validación de campos críticos con valores predeterminados
    const camposRequeridos = [
        'nombre_cliente', 'tipo_convenio', 'as_nombre', 'ap_paterno', 'ap_materno',
        'marca', 'modelo', 'color', 'placas', 'direccion_origen', 'direccion_destino'
    ];
    // Proporcionar valores predeterminados para campos faltantes
    camposRequeridos.forEach(campo => {
        if (!datos[campo]) {
            datos[campo] = 'No especificado';
            console.warn(`Campo ${campo} no proporcionado, usando valor predeterminado`);
        }
    });
    // Asegurar que datos.fecha exista
    if (!datos.fecha) {
        datos.fecha = new Date();
        console.warn('Fecha no proporcionada, usando fecha actual');
    }
    // Extraer información del usuario de forma segura
    const userName = user?.displayName || user?.name || 'No especificado';
    const userEmail = user?.email || 'No especificado';
    console.log("Información del usuario para el PDF:", { userName, userEmail });
    try {
        // Generar nombre único para el archivo
        const nombreArchivo = `acuse_${datos.id_cliente}_${datos.id_servicio}_${Date.now()}.pdf`;
        const rutaCompleta = path.join(directorioAcuses, nombreArchivo);
        // Verificar que el directorio de acuses exista
        if (!fs.existsSync(directorioAcuses)) {
            fs.mkdirSync(directorioAcuses, { recursive: true });
        }
        return new Promise((resolve, reject) => {
            try {
                // Crear nuevo documento PDF
                const doc = new PDFDocument({ 
                    size: 'A4', 
                    margin: 50,
                    info: {
                        Title: `Ficha de Servicio ${datos.id_servicio}`,
                        Author: 'AMA Cuernavaca',
                        Subject: 'Ficha de Registro de Servicio',
                        Keywords: 'ficha, servicio, grúa, traslado',
                        CreationDate: new Date()
                    }
                });
                // Configurar stream de escritura
                const writeStream = fs.createWriteStream(rutaCompleta);
                // Manejar errores del stream
                writeStream.on('error', (err) => {
                    console.error('Error al escribir el PDF:', err);
                    reject(new Error(`Error al escribir el PDF: ${err.message}`));
                });
                // Promesa para manejar la finalización del stream
                const streamFinished = new Promise((resolveStream, rejectStream) => {
                    writeStream.on('finish', resolveStream);
                    writeStream.on('error', rejectStream);
                });
                // Conectar documento con stream
                doc.pipe(writeStream);
                // Paleta de colores moderna y elegante
                const colorPrimario = '#FF8C00';      // Naranja más brillante
                const colorPrimarioDark = '#E67E22';  // Naranja oscuro
                const colorSecundario = '#2C3E50';    // Azul oscuro
                const colorFondo = '#FFFFFF';         // Fondo blanco para mayor limpieza
                const colorTexto = '#333333';         // Texto principal
                const colorSubtexto = '#666666';      // Texto secundario
                const colorBorde = '#EEEEEE';         // Borde suave
                // Rutas para los iconos
                const logoPath = path.join(__dirname, '..', 'public', 'acuses', 'recurses', 'logo.png');
                const iconClientePath = path.join(__dirname, '..', 'public', 'acuses', 'recurses', 'user-icon.png');
                const iconCarPath = path.join(__dirname, '..', 'public', 'acuses', 'recurses', 'car-icon.png');
                const iconServicePath = path.join(__dirname, '..', 'public', 'acuses', 'recurses', 'service-icon.png');
                const iconOriginPath = path.join(__dirname, '..', 'public', 'acuses', 'recurses', 'origin-icon.png');
                const iconDestinationPath = path.join(__dirname, '..', 'public', 'acuses', 'recurses', 'destination-icon.png');
                // Fondo blanco limpio
                doc.rect(0, 0, doc.page.width, doc.page.height).fill(colorFondo);
                // Encabezado con diseño mejorado
                doc.rect(0, 0, doc.page.width, 15)
                   .fill(colorPrimario);
                // Cargar logo
                try {
                    if (fs.existsSync(logoPath)) {
                        doc.image(logoPath, 50, 30, { width: 80 });
                        console.log('Logo cargado correctamente desde:', logoPath);
                    } else {
                        console.warn('Logo no encontrado en:', logoPath);
                        // Texto alternativo...
                    }
                } catch (imgErr) {
                    console.error('Error cargando logo:', imgErr);
                }
                // Título simplificado como solicitado
                doc.fontSize(22)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('AMA CUERNAVACA', 150, 45);
                
                doc.fontSize(10)
                   .fillColor(colorSubtexto)
                   .font('Helvetica')
                   .text('Asociación Morelos Automovilística S.A de C.V.', 150, 75);
                // Fecha y folio en el lado derecho con mejor diseño
                doc.fontSize(10)
                   .fillColor(colorSubtexto)
                   .text(`Fecha: ${new Date(datos.fecha).toLocaleDateString()}`, 400, 40);
                // Folio con estilo más elegante
                doc.roundedRect(400, 60, 150, 30, 5)
                   .fillAndStroke(colorPrimario, colorPrimario);
                doc.fontSize(12)
                   .fillColor('#FFFFFF')
                   .font('Helvetica-Bold')
                   .text(`FOLIO: ${datos.id_servicio || datos.n_folio}`, 410, 70);
                // Línea separadora horizontal con degradado
                const gradient = doc.linearGradient(50, 120, doc.page.width - 50, 120);
                gradient.stop(0, colorPrimario).stop(1, colorSecundario);
                
                doc.moveTo(50, 120)
                   .lineTo(doc.page.width - 50, 120)
                   .lineWidth(2)
                   .stroke(gradient);
                const startY = 140;
                const margenIzq = 50;
                // Sección: Datos del Contratante con diseño mejorado
                // Intentar cargar icono de cliente
                try {
                    if (fs.existsSync(iconClientePath)) {
                        doc.image(iconClientePath, margenIzq, startY, { width: 20 });
                    }
                } catch (err) {
                    console.warn('No se pudo cargar el icono de cliente:', err);
                }
                
                doc.fontSize(14)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Datos del Contratante', margenIzq + 25, startY);
                // Línea decorativa con degradado
                const gradientTitle1 = doc.linearGradient(margenIzq + 25, startY + 22, margenIzq + 75, startY + 22);
                gradientTitle1.stop(0, colorPrimario).stop(1, colorSecundario);
                
                doc.moveTo(margenIzq + 25, startY + 22)
                   .lineTo(margenIzq + 125, startY + 22)
                   .lineWidth(3)
                   .stroke(gradientTitle1);
                // Datos del contratante con diseño mejorado
                const contratanteY = startY + 35;
                const colWidth = 250;
                // Fondo para datos del contratante
                doc.roundedRect(margenIzq, contratanteY - 5, doc.page.width - 100, 50, 5)
                   .fillAndStroke('#F8F9FA', colorBorde);
                // Columna 1
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Nombre:', margenIzq + 10, contratanteY);
                doc.fontSize(10)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.as_nombre} ${datos.ap_paterno} ${datos.ap_materno}`, margenIzq + 100, contratanteY);
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Teléfono:', margenIzq + 10, contratanteY + 20);
                doc.fontSize(10)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.as_telefono || 'No especificado'}`, margenIzq + 100, contratanteY + 20);
                // Columna 2
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('RFC:', margenIzq + colWidth, contratanteY);
                doc.fontSize(10)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.as_rfc || 'No especificado'}`, margenIzq + colWidth + 100, contratanteY);
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('No. Póliza:', margenIzq + colWidth, contratanteY + 20);
                doc.fontSize(10)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.n_folio || 'No especificado'}`, margenIzq + colWidth + 100, contratanteY + 20);
                // Espacio entre secciones
                const espacioSecciones = 15;
                // Sección: Datos del Vehículo con diseño mejorado
                const vehiculoY = contratanteY + 65;
                
                // Intentar cargar icono de vehículo
                try {
                    if (fs.existsSync(iconCarPath)) {
                        doc.image(iconCarPath, margenIzq, vehiculoY, { width: 20 });
                    }
                } catch (err) {
                    console.warn('No se pudo cargar el icono de vehículo:', err);
                }
                
                doc.fontSize(14)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Datos del Vehículo', margenIzq + 25, vehiculoY);
                // Línea decorativa con degradado
                const gradientTitle2 = doc.linearGradient(margenIzq + 25, vehiculoY + 22, margenIzq + 75, vehiculoY + 22);
                gradientTitle2.stop(0, colorPrimario).stop(1, colorSecundario);
                
                doc.moveTo(margenIzq + 25, vehiculoY + 22)
                   .lineTo(margenIzq + 125, vehiculoY + 22)
                   .lineWidth(3)
                   .stroke(gradientTitle2);
                // Datos del vehículo con diseño mejorado
                const vehiculoDataY = vehiculoY + 35;
                // Fondo para datos del vehículo
                doc.roundedRect(margenIzq, vehiculoDataY - 5, doc.page.width - 100, 50, 5)
                   .fillAndStroke('#F8F9FA', colorBorde);
                // Columna 1
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Marca:', margenIzq + 10, vehiculoDataY);
                doc.fontSize(10)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.marca}`, margenIzq + 100, vehiculoDataY);
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Modelo:', margenIzq + 10, vehiculoDataY + 20);
                doc.fontSize(10)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.modelo}`, margenIzq + 100, vehiculoDataY + 20);
                // Columna 2
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Color:', margenIzq + colWidth, vehiculoDataY);
                doc.fontSize(10)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.color}`, margenIzq + colWidth + 100, vehiculoDataY);
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Placas:', margenIzq + colWidth, vehiculoDataY + 20);
                doc.fontSize(10)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.placas}`, margenIzq + colWidth + 100, vehiculoDataY + 20);
                // Sección: Datos del Servicio con diseño mejorado
                const servicioY = vehiculoDataY + 65;
                
                // Intentar cargar icono de servicio
                try {
                    if (fs.existsSync(iconServicePath)) {
                        doc.image(iconServicePath, margenIzq, servicioY, { width: 20 });
                    }
                } catch (err) {
                    console.warn('No se pudo cargar el icono de servicio:', err);
                }
                
                doc.fontSize(14)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Datos del Servicio', margenIzq + 25, servicioY);
                // Línea decorativa con degradado
                const gradientTitle3 = doc.linearGradient(margenIzq + 25, servicioY + 22, margenIzq + 75, servicioY + 22);
                gradientTitle3.stop(0, colorPrimario).stop(1, colorSecundario);
                
                doc.moveTo(margenIzq + 25, servicioY + 22)
                   .lineTo(margenIzq + 125, servicioY + 22)
                   .lineWidth(3)
                   .stroke(gradientTitle3);
                // Datos del servicio con diseño mejorado
                const servicioDataY = servicioY + 35;
                // Fondo para IDs
                doc.roundedRect(margenIzq, servicioDataY - 5, doc.page.width - 100, 25, 5)
                   .fillAndStroke('#F8F9FA', colorBorde);
                // ID Cliente e ID Servicio en la misma línea
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('ID Cliente:', margenIzq + 10, servicioDataY);
                doc.fontSize(10)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.id_cliente}`, margenIzq + 100, servicioDataY);
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('ID Servicio:', margenIzq + colWidth, servicioDataY);
                doc.fontSize(10)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.id_servicio || datos.n_folio}`, margenIzq + colWidth + 100, servicioDataY);
                // Dirección Origen con mejor formato
                // Intentar cargar icono de origen
                try {
                    if (fs.existsSync(iconOriginPath)) {
                        doc.image(iconOriginPath, margenIzq, servicioDataY + 30, { width: 16 });
                    }
                } catch (err) {
                    console.warn('No se pudo cargar el icono de origen:', err);
                }
                
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Dirección Origen:', margenIzq + 20, servicioDataY + 30);
                // Contenedor para dirección origen con diseño mejorado
                doc.roundedRect(margenIzq, servicioDataY + 45, doc.page.width - 100, 35, 5)
                   .fillAndStroke('#F8F9FA', colorBorde);
                doc.fontSize(9)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.direccion_origen}`, margenIzq + 10, servicioDataY + 55, { 
                       width: doc.page.width - 120,
                       align: 'left'
                   });
                // Dirección Destino con diseño mejorado
                // Intentar cargar icono de destino
                try {
                    if (fs.existsSync(iconDestinationPath)) {
                        doc.image(iconDestinationPath, margenIzq, servicioDataY + 90, { width: 16 });
                    }
                } catch (err) {
                    console.warn('No se pudo cargar el icono de destino:', err);
                }
                
                doc.fontSize(10)
                   .fillColor(colorSecundario)
                   .font('Helvetica-Bold')
                   .text('Dirección Destino:', margenIzq + 20, servicioDataY + 90);
                // Contenedor para dirección destino con diseño mejorado
                doc.roundedRect(margenIzq, servicioDataY + 105, doc.page.width - 100, 35, 5)
                   .fillAndStroke('#F8F9FA', colorBorde);
                doc.fontSize(9)
                   .fillColor(colorTexto)
                   .font('Helvetica')
                   .text(`${datos.direccion_destino}`, margenIzq + 10, servicioDataY + 115, { 
                       width: doc.page.width - 120,
                       align: 'left'
                   });
                // Distancia y Tiempo estimado con diseño mejorado
                if (datos.km || datos.minutos) {
                    const infoY = servicioDataY + 150;
                    
                    // Fondo para información adicional
                    doc.roundedRect(margenIzq, infoY - 5, doc.page.width - 100, 25, 5)
                       .fillAndStroke('#F8F9FA', colorBorde);
                    
                    doc.fontSize(9)
                       .fillColor(colorSecundario)
                       .font('Helvetica-Bold')
                       .text('Distancia estimada:', margenIzq + 10, infoY);
                    doc.fontSize(9)
                       .fillColor(colorTexto)
                       .font('Helvetica')
                       .text(`${datos.km ? Math.round(datos.km * 10) / 10 : 'N/A'} km`, margenIzq + 100, infoY);
                    doc.fontSize(9)
                       .fillColor(colorSecundario)
                       .font('Helvetica-Bold')
                       .text('Tiempo estimado:', margenIzq + colWidth, infoY);
                    
                    // Convertir minutos a formato horas:minutos
                    let tiempoTexto = 'N/A';
                    if (datos.minutos) {
                        const horas = Math.floor(datos.minutos / 60);
                        const minutos = Math.round(datos.minutos % 60);
                        tiempoTexto = horas > 0 ? 
                            `${horas} h ${minutos} min` : 
                            `${minutos} min`;
                    }
                    doc.fontSize(9)
                       .fillColor(colorTexto)
                       .font('Helvetica')
                       .text(tiempoTexto, margenIzq + colWidth + 100, infoY);
                }
                // Pie de página movido más arriba con diseño mejorado
                const footerY = doc.page.height - 100; // Movido 50 unidades más arriba
                
                // Línea superior del pie de página con degradado
                const gradientFooter = doc.linearGradient(0, footerY - 5, doc.page.width, footerY - 5);
                gradientFooter.stop(0, colorSecundario).stop(0.5, colorPrimario).stop(1, colorSecundario);
                
                doc.rect(0, footerY - 5, doc.page.width, 5)
                   .fill(gradientFooter);
                
                // Texto del pie de página con diseño mejorado
                doc.fontSize(8)
                   .fillColor(colorSubtexto)
                   .text('Documento generado por el sistema GruaTrack', 50, footerY + 10, { 
                      width: doc.page.width - 80,
                      align: 'center'
                   });
                doc.fontSize(8)
                   .fillColor(colorSubtexto)
                   .text(`Usuario: ${userName} | Email: ${userEmail} | Fecha: ${new Date().toLocaleString()}`, 
                         50, footerY + 25, { 
                            width: doc.page.width - 100,
                            align: 'center'
                         });
                // Finalizar documento
                doc.end();
                // Esperar a que termine de escribir
                streamFinished
                    .then(() => {
                        console.log('PDF generado exitosamente en:', rutaCompleta);
                        resolve(path.join('acuses', nombreArchivo).replace(/\\/g, '/'));
                    })
                    .catch(error => {
                        console.error('Error al finalizar el PDF:', error);
                        reject(error);
                    });
            } catch (error) {
                console.error('Error al generar contenido del PDF:', error);
                reject(error);
            }
        });
    } catch (error) {
        console.error('Error al inicializar la generación del PDF:', error);
        throw error;
    }
};
module.exports = { generarPDF };