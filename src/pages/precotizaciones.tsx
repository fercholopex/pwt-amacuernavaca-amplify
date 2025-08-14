import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { signOut } from "firebase/auth";
import Head from 'next/head';
import { useAuth } from '../components/AuthContext';
import { auth } from '../components/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { API } from '@aws-amplify/api';
import styles from '@/styles/stylesmds/precotizaciones.module.css';
const Precotizaciones = () => {
    const router = useRouter();
    const { id_cliente, n_folio, as_nombre, ap_paterno, ap_materno, as_rfc, km, minutos } = router.query;
    const { user } = useAuth();
    const [clienteData, setClienteData] = useState({});
    const [nuevoIdServicio, setNuevoIdServicio] = useState('');
    const [isClient, setIsClient] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
    const [formData, setFormData] = useState({
        id_cliente: id_cliente || '',
        id_servicio: '',
        n_folio: n_folio || '',
        tipo_servicio: 'local',
        detalle_servicio: 'asistencia vial',
        banderazo: '',
        km: km || '',
        minutos: minutos || '',
        costo_km: '',
        km_extra: '0',
        costo_km_extra: '',
        costo_adicional: '0',
        costo_asegurado: '0',
        num_casetas: '0',
        costo_casetas: '0',
        total: '',
        porcentaje_iva: 16,
        total_con_iva: '',
    });
    // Marcar cuando estamos en el cliente
    useEffect(() => {
        setIsClient(true);
    }, []);
    // Actualizar id_cliente cuando cambie en el router
    useEffect(() => {
        if (id_cliente) {
            setFormData(prev => ({
                ...prev,
                id_cliente: id_cliente
            }));
        }
    }, [id_cliente]);
    // Obtener el último ID de servicio al cargar el componente
const obtenerUltimoIdServicio = async () => {
  try {
    const response = await get('trafficAPI', '/api/precotizaciones/ultimo-id-servicio');
    const data = response.data;
    const ultimoId = data.ultimoId || 0;
    const nuevoId = ultimoId + 1;
    setNuevoIdServicio(String(nuevoId));
    setFormData(prev => ({
      ...prev,
      id_servicio: String(nuevoId)
    }));
  } catch (error) {
    console.error('Error al obtener último ID de servicio:', error);
    showNotification('Error al obtener último ID de servicio', 'error');
  }
};
const fetchClienteData = async () => {
  if (id_cliente) {
    try {
      const response = await get('trafficAPI', `/api/catalogos/clientes/${id_cliente}`);
      const data = response.data;
      setClienteData(data);
      setFormData(prev => ({
        ...prev,
        banderazo: data.banderazo || '',
        costo_km: data.costokm || '',
        tipo_servicio: data.tipo_servicio || prev.tipo_servicio,
      }));
    } catch (error) {
      console.error('Error al obtener datos del cliente:', error);
      showNotification('Error de conexión al obtener datos del cliente', 'error');
    }
  }
};
obtenerUltimoIdServicio();
fetchClienteData();
    useEffect(() => {
        const updateCosts = () => {
            const costoKmBase = parseFloat(clienteData.costokm) || 0;
            const costo_km = (parseFloat(formData.km) || 0) * costoKmBase;
            const costo_km_extra = (parseFloat(formData.km_extra) || 0) * costoKmBase;
            const subtotal = calculateSubtotal({
                ...formData,
                costo_km,
                costo_km_extra
            });
            const iva = subtotal * (formData.porcentaje_iva / 100);
            const totalConIva = subtotal + iva;
            setFormData(prevState => ({
                ...prevState,
                costo_km: costo_km.toFixed(2),
                costo_km_extra: costo_km_extra.toFixed(2),
                total: subtotal.toFixed(2),
                total_con_iva: totalConIva.toFixed(2)
            }));
        };
        updateCosts();
    }, [formData.km, formData.km_extra, formData.costo_adicional, formData.costo_asegurado, formData.costo_casetas, formData.banderazo, clienteData]);
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            window.location.href = '/';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showNotification('Error al cerrar sesión: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'error');
        }
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        let processedValue = value;
        if (!isNaN(value) && value !== '') {
            processedValue = value.replace(/^0+/, '');
        }
        setFormData((prevState) => ({
            ...prevState,
            [name]: processedValue
        }));
    };
    const calculateSubtotal = (data) => {
        const banderazo = parseFloat(data.banderazo) || 0;
        const costoKmBase = parseFloat(data.costo_km) || 0;
        const costoKmExtra = parseFloat(data.costo_km_extra) || 0;
        const costoAdicional = parseFloat(data.costo_adicional) || 0;
        const costoAsegurado = parseFloat(data.costo_asegurado) || 0;
        const costoCasetas = parseFloat(data.costo_casetas) || 0;
        return banderazo + costoKmBase + costoKmExtra + costoAdicional + costoAsegurado + costoCasetas;
    };
    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        // Ocultar después de 5 segundos
        setTimeout(() => {
            setNotification({ show: false, message: '', type: 'success' });
        }, 5000);
    };
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    if (!formData.banderazo || !formData.km) {
      throw new Error('Los campos de banderazo y kilómetros son obligatorios');
    }
    if (!formData.id_cliente) {
      throw new Error('El ID de cliente es obligatorio');
    }
    if (!formData.id_servicio) {
      throw new Error('El ID de servicio no se ha generado correctamente');
    }
    console.log('Datos a enviar:', formData);
    
    const response = await get('trafficAPI', '/api/precotizaciones', {
      body: {
        ...formData,
        id_cliente: String(formData.id_cliente),
        id_servicio: String(nuevoIdServicio),
        km: String(formData.km),
        banderazo: String(formData.banderazo),
        costo_km: String(formData.costo_km),
        total: String(formData.total),
        porcentaje_iva: Number(formData.porcentaje_iva),
        total_con_iva: String(formData.total_con_iva)
      }
    });
    console.log('Respuesta del servidor:', response);
    
    if (!response.success) {
      throw new Error(response.message || 'Error en la respuesta del servidor');
    }
    showNotification('Precotización registrada exitosamente', 'success');
    setTimeout(() => {
      router.push('/servicios');
    }, 2000);
  } catch (error) {
    console.error('Error detallado:', error);
    showNotification(`Error al registrar la precotización: ${error.message}`, 'error');
  }
};
    return (
        <div>
            <Head>
                <title>Precotizaciones - AMA cuernavaca</title>
                <link rel="icon" href="/img/ico2.ico" type="image/x-icon" />
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
            </Head>
            
            {/* Notificación */}
            <AnimatePresence>
                {notification.show && (
                    <motion.div 
                        className={notification.type === 'success' ? styles.success : notification.type === 'warning' ? styles.warning : styles.error}
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                    >
                        <div className={styles.notificationContent}>
                            <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : notification.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle'}`}></i>
                            <p>{notification.message}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Header Principal */}
            <div className={styles.pageHeader}>
                <div className={styles.backgroundImage}></div>
                <div className={styles.filter}></div>
                <div className={styles.headerContent}>
                    <h1 className={styles.presentationTitle}>
                        Precotizaciones
                    </h1>
                </div>
            </div>
            
            {/* Renderizado condicional para evitar problemas de hidratación */}
            {isClient && (
                <section>
                    <motion.div 
                        className={styles.clientInfoContainer}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className={styles.sectionHeading}>
                            <i className="fas fa-info-circle"></i> Información del Servicio
                        </h2>
                        <div className={styles.clientInfoGrid}>
                            <div className={styles.infoCard}>
                                <div className={styles.infoCardHeader}>
                                    <i className="fas fa-user-circle"></i>
                                    <h3>Cliente</h3>
                                </div>
                                <div className={styles.infoCardContent}>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>ID Cliente:</span>
                                        <span className={styles.infoValue}>{id_cliente}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Nombre:</span>
                                        <span className={styles.infoValue}>{clienteData.nombre_cliente}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Convenio:</span>
                                        <span className={styles.infoValue}>{clienteData.tipo_convenio}</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.infoCard}>
                                <div className={styles.infoCardHeader}>
                                    <i className="fas fa-file-alt"></i>
                                    <h3>Servicio</h3>
                                </div>
                                <div className={styles.infoCardContent}>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Folio: </span>
                                        <span className={styles.infoValue}>{n_folio}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>ID Servicio:   </span>
                                        <span className={styles.infoValue}>{nuevoIdServicio}</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Solicitante:   </span>
                                        <span className={styles.infoValue}>{`${as_nombre || ''} ${ap_paterno || ''} ${ap_materno || ''}`}</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.infoCard}>
                                <div className={styles.infoCardHeader}>
                                    <i className="fas fa-route"></i>
                                    <h3>Ruta</h3>
                                </div>
                                <div className={styles.infoCardContent}>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Kilómetros:    </span>
                                        <span className={styles.infoValue}>{km} km</span>
                                    </div>
                                    <div className={styles.infoItem}>
                                        <span className={styles.infoLabel}>Tiempo estimado:   </span>
                                        <span className={styles.infoValue}>{minutos} minutos</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div 
                        className={styles.formContainer}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <h2 className={styles.sectionHeading}>
                            <i className="fas fa-calculator"></i> Registrar Precotización
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formColumns}>
                                <div className={styles.formColumn}>
                                    <h3 className={styles.columnTitle}>Detalles del Servicio</h3>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="tipo_servicio">Tipo de Servicio</label>
                                        <div className={styles.inputWithIcon}>
                                            <i className="fas fa-tag"></i>
                                            <input 
                                                type="text"
                                                id="tipo_servicio" 
                                                name="tipo_servicio" 
                                                value={formData.tipo_servicio} 
                                                readOnly 
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="detalle_servicio">Detalle del Servicio</label>
                                        <div className={styles.inputWithIcon}>
                                            <i className="fas fa-list-ul"></i>
                                            <select 
                                                id="detalle_servicio" 
                                                name="detalle_servicio" 
                                                value={formData.detalle_servicio} 
                                                onChange={handleChange} 
                                                required
                                            >
                                                <option value="asistencia vial">Asistencia vial</option>
                                                <option value="arrastre">Arrastre</option>
                                                <option value="rescate">Rescate</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="banderazo">Banderazo</label>
                                        <div className={styles.inputWithIcon}>
                                            <i className="fas fa-flag"></i>
                                            <input 
                                                type="text"
                                                id="banderazo" 
                                                name="banderazo" 
                                                value={formData.banderazo} 
                                                readOnly 
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="km">Kilómetros</label>
                                        <div className={styles.inputWithIcon}>
                                            <i className="fas fa-road"></i>
                                            <input 
                                                type="text"
                                                id="km" 
                                                name="km" 
                                                value={formData.km} 
                                                onChange={handleChange} 
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="costo_km">Costo por Kilómetro</label>
                                        <div className={styles.inputWithIcon}>
                                            <i className="fas fa-dollar-sign"></i>
                                            <input 
                                                type="text"
                                                id="costo_km" 
                                                name="costo_km" 
                                                value={formData.costo_km} 
                                                readOnly 
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.formColumn}>
                                    <h3 className={styles.columnTitle}>Costos Adicionales</h3>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="km_extra">Kilómetros Extras</label>
                                        <div className={styles.inputWithIcon}>
                                            <i className="fas fa-plus-circle"></i>
                                            <input 
                                                type="text"
                                                id="km_extra" 
                                                name="km_extra" 
                                                value={formData.km_extra} 
                                                onChange={handleChange} 
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="costo_km_extra">Costo Kilómetros Extras</label>
                                        <div className={styles.inputWithIcon}>
                                            <i className="fas fa-dollar-sign"></i>
                                            <input 
                                                type="text"
                                                id="costo_km_extra" 
                                                name="costo_km_extra" 
                                                value={formData.costo_km_extra} 
                                                readOnly 
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="costo_adicional">Costo Adicional</label>
                                        <div className={styles.inputWithIcon}>
                                            <i className="fas fa-dollar-sign"></i>
                                            <input 
                                                type="text"
                                                id="costo_adicional" 
                                                name="costo_adicional" 
                                                value={formData.costo_adicional} 
                                                onChange={handleChange} 
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="costo_asegurado">Costo Asegurado</label>
                                        <div className={styles.inputWithIcon}>
                                            <i className="fas fa-shield-alt"></i>
                                            <input 
                                                type="text"
                                                id="costo_asegurado" 
                                                name="costo_asegurado" 
                                                value={formData.costo_asegurado} 
                                                onChange={handleChange} 
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
                                            <label htmlFor="num_casetas">Número de Casetas</label>
                                            <input 
                                                type="text"
                                                id="num_casetas" 
                                                name="num_casetas" 
                                                value={formData.num_casetas} 
                                                onChange={handleChange} 
                                            />
                                        </div>
                                        <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
                                            <label htmlFor="costo_casetas">Costo de Casetas</label>
                                            <input 
                                                type="text"
                                                id="costo_casetas" 
                                                name="costo_casetas" 
                                                value={formData.costo_casetas} 
                                                onChange={handleChange} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.totalsSection}>
                                <h3 className={styles.columnTitle}>Totales</h3>
                                <div className={styles.totalsGrid}>
                                    <div className={styles.totalItem}>
                                        <span className={styles.totalLabel}>Total Neto (sin IVA):</span>
                                        <div className={styles.totalValueContainer}>
                                            <span className={styles.currency}>$</span>
                                            <span className={styles.totalValue}>{formData.total}</span>
                                        </div>
                                    </div>
                                    <div className={styles.highlighted}>
                                        <span className={styles.totalLabel}>Total con IVA (16%):</span>
                                        <div className={styles.totalValueContainer}>
                                            <span className={styles.currency}>$</span>
                                            <span className={styles.totalValue}>{formData.total_con_iva}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <motion.button 
                                type="submit" 
                                className={styles.submitButton}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <i className="fas fa-check-circle"></i> Registrar Precotización
                            </motion.button>
                        </form>
                    </motion.div>
                </section>
            )}
            <footer className={styles.footer}>
                {user && (
                    <div className={styles.footerContent}>
                        <p className={styles.userInfo}>
                            <i className="fas fa-user"></i> {user.displayName || 'Nombre no disponible'}
                        </p>
                        <p className={styles.userEmail}>
                            <i className="fas fa-envelope"></i> {user.email}
                        </p>
                    </div>
                )}
            </footer>
        </div>
    );
};
export default Precotizaciones;