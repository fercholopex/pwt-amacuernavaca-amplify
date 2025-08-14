import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useAuth } from '../components/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from '../components/firebase';
import styles from '@/styles/stylesmds/catalogos.module.css';
const Catalogos = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('clientes');
    const [activeSubTab, setActiveSubTab] = useState('operadores');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    
    // Estados para cada catálogo
    const [clientes, setClientes] = useState([]);
    const [operadores, setOperadores] = useState([]);
    const [gruas, setGruas] = useState([]);
    
    // Estados para búsqueda
    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [busquedaOperador, setBusquedaOperador] = useState('');
    const [busquedaGrua, setBusquedaGrua] = useState('');
    
    // Estados para modales
    const [modalCliente, setModalCliente] = useState(false);
    const [modalOperador, setModalOperador] = useState(false);
    const [modalGrua, setModalGrua] = useState(false);
    
    // Estados para edición
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [operadorSeleccionado, setOperadorSeleccionado] = useState(null);
    const [gruaSeleccionada, setGruaSeleccionada] = useState(null);
    
    // Estados para asignación
    const [gruaSeleccionadaAsignacion, setGruaSeleccionadaAsignacion] = useState('');
    const [operadorSeleccionadoAsignacion, setOperadorSeleccionadoAsignacion] = useState('');
    const [loadingAsignacion, setLoadingAsignacion] = useState(false);
    
    // Estados para loading y error
    const [loading, setLoading] = useState({
        clientes: false,
        operadores: false,
        gruas: false
    });
    const [error, setError] = useState({
        clientes: null,
        operadores: null,
        gruas: null
    });
    
    // Estados para paginación
    const [paginacion, setPaginacion] = useState({
        clientes: { pagina: 1, totalPaginas: 1, elementosPorPagina: 30, total: 0 },
        operadores: { pagina: 1, totalPaginas: 1, elementosPorPagina: 30, total: 0 },
        gruas: { pagina: 1, totalPaginas: 1, elementosPorPagina: 30, total: 0 }
    });
    
    // Datos paginados
    const [clientesPaginados, setClientesPaginados] = useState([]);
    const [operadoresPaginados, setOperadoresPaginados] = useState([]);
    const [gruasPaginadas, setGruasPaginadas] = useState([]);
    
    // Estado para notificaciones
    const [notifications, setNotifications] = useState([]);
    
    // Estados para modal de confirmación
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'info', // info, delete, warning, save
        confirmText: '',
        cancelText: ''
    });
    
    // Componente de confirmación
    const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type }) => {
        if (!isOpen) return null;
        // Determinar el ícono según el tipo
        let icon;
        switch (type) {
            case 'delete':
                icon = 'fas fa-trash-alt';
                break;
            case 'warning':
                icon = 'fas fa-exclamation-triangle';
                break;
            case 'save':
                icon = 'fas fa-save';
                break;
            default:
                icon = 'fas fa-question-circle';
        }
        
        return (
            <motion.div 
                className={styles.confirmationModalOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                    // Cerrar modal al hacer clic en el overlay
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div 
                    className={`${styles.confirmationModalContent} ${styles[type]}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", damping: 20 }}
                >
                    <div className={styles.confirmationModalIcon}>
                        <i className={icon}></i>
                    </div>
                    <h3>{title}</h3>
                    <p>{message}</p>
                    <div className={styles.confirmationModalActions}>
                        <motion.button 
                            className={styles.btnCancel} 
                            onClick={onClose}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <i className="fas fa-times"></i> {cancelText || 'Cancelar'}
                        </motion.button>
                        <motion.button 
                            className={`${styles.btnConfirm} ${styles[`btn${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <i className={icon}></i> {confirmText || 'Confirmar'}
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        );
    };
    
    // Función para mostrar notificaciones
    const showNotification = (message, type = 'info', duration = 5000) => {
        const id = Date.now();
        const notification = {
            id,
            message,
            type,
            duration,
            title: type.charAt(0).toUpperCase() + type.slice(1)
        };
        setNotifications(prev => [...prev, notification]);
        // Eliminar la notificación después de la duración especificada
        setTimeout(() => {
            removeNotification(id);
        }, duration);
    };
    
    // Función para eliminar una notificación
    const removeNotification = (id) => {
        setNotifications(prev => {
            // Marcar la notificación para animación de salida
            const updated = prev.map(notif => 
                notif.id === id ? { ...notif, exit: true } : notif
            );
            // Eliminar después de la animación
            setTimeout(() => {
                setNotifications(prev => prev.filter(notif => notif.id !== id));
            }, 300); // Duración de la animación
            return updated;
        });
    };
    
    // Componente de notificación
    const Notification = ({ notification }) => {
        const { id, message, type, title, duration, exit } = notification;
        // Determinar el icono según el tipo
        let icon;
        switch (type) {
            case 'success':
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                icon = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                icon = 'fas fa-exclamation-triangle';
                break;
            default:
                icon = 'fas fa-info-circle';
        }
        
        return (
            <div className={`${styles.notification} ${styles[type]} ${exit ? styles.exit : ''}`}>
                <div className={styles.notificationIcon}>
                    <i className={icon}></i>
                </div>
                <div className={styles.notificationContent}>
                    <h4 className={styles.notificationTitle}>{title}</h4>
                    <p className={styles.notificationMessage}>{message}</p>
                </div>
                <button 
                    className={styles.notificationClose} 
                    onClick={() => removeNotification(id)}
                >
                    <i className="fas fa-times"></i>
                </button>
                <div className={styles.notificationProgress}>
                    <div 
                        className={styles.notificationProgressBar}
                        style={{ animationDuration: `${duration}ms` }}
                    ></div>
                </div>
            </div>
        );
    };
    
    // Función para mostrar el modal de confirmación
    const showConfirmation = ({ title, message, onConfirm, type = 'info', confirmText = 'Confirmar', cancelText = 'Cancelar' }) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm,
            type,
            confirmText,
            cancelText
        });
    };
    
    // Función para cerrar el modal de confirmación
    const closeConfirmation = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };
    
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            window.location.href = '/';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            showNotification('Error al cerrar sesión: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'error');
        }
    };
    
    // Efecto para manejar el scroll y la clase del navbar
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };
        
        window.addEventListener('scroll', handleScroll);
        
        // Cargar datos iniciales
        fetchClientes();
        fetchOperadores();
        fetchGruas();
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);
    
    // Efectos para actualizar datos paginados cuando cambian los datos o la paginación
    useEffect(() => {
        actualizarClientesPaginados();
    }, [clientes, paginacion.clientes.pagina, paginacion.clientes.elementosPorPagina]);
    
    useEffect(() => {
        actualizarOperadoresPaginados();
    }, [operadores, paginacion.operadores.pagina, paginacion.operadores.elementosPorPagina]);
    
    useEffect(() => {
        actualizarGruasPaginadas();
    }, [gruas, paginacion.gruas.pagina, paginacion.gruas.elementosPorPagina]);
    
    // Funciones para actualizar datos paginados
    const actualizarClientesPaginados = () => {
        const { pagina, elementosPorPagina } = paginacion.clientes;
        const inicio = (pagina - 1) * elementosPorPagina;
        const fin = inicio + elementosPorPagina;
        setClientesPaginados(clientes.slice(inicio, fin));
        // Actualizar total de páginas
        const totalPaginas = Math.ceil(clientes.length / elementosPorPagina) || 1;
        setPaginacion(prev => ({
            ...prev,
            clientes: {
                ...prev.clientes,
                totalPaginas,
                total: clientes.length
            }
        }));
    };
    
    const actualizarOperadoresPaginados = () => {
        const { pagina, elementosPorPagina } = paginacion.operadores;
        const inicio = (pagina - 1) * elementosPorPagina;
        const fin = inicio + elementosPorPagina;
        setOperadoresPaginados(operadores.slice(inicio, fin));
        // Actualizar total de páginas
        const totalPaginas = Math.ceil(operadores.length / elementosPorPagina) || 1;
        setPaginacion(prev => ({
            ...prev,
            operadores: {
                ...prev.operadores,
                totalPaginas,
                total: operadores.length
            }
        }));
    };
    
    const actualizarGruasPaginadas = () => {
        const { pagina, elementosPorPagina } = paginacion.gruas;
        const inicio = (pagina - 1) * elementosPorPagina;
        const fin = inicio + elementosPorPagina;
        setGruasPaginadas(gruas.slice(inicio, fin));
        // Actualizar total de páginas
        const totalPaginas = Math.ceil(gruas.length / elementosPorPagina) || 1;
        setPaginacion(prev => ({
            ...prev,
            gruas: {
                ...prev.gruas,
                totalPaginas,
                total: gruas.length
            }
        }));
    };
    
    // Funciones para cambiar página
    const cambiarPagina = (tipo, nuevaPagina) => {
        if (nuevaPagina < 1 || nuevaPagina > paginacion[tipo].totalPaginas) return;
        setPaginacion(prev => ({
            ...prev,
            [tipo]: {
                ...prev[tipo],
                pagina: nuevaPagina
            }
        }));
    };
    
    // Función para cambiar elementos por página
    const cambiarElementosPorPagina = (tipo, cantidad) => {
        setPaginacion(prev => ({
            ...prev,
            [tipo]: {
                ...prev[tipo],
                elementosPorPagina: parseInt(cantidad),
                pagina: 1 // Volver a la primera página al cambiar la cantidad
            }
        }));
    };
    
    // Funciones para cargar datos
    const fetchClientes = async () => {
        try {
            setLoading(prev => ({ ...prev, clientes: true }));
            setError(prev => ({ ...prev, clientes: null }));
            const response = await fetch(`http://localhost:5000/api/catalogos/clientes?busqueda=${busquedaCliente}`);
            if (!response.ok) {
                throw new Error('Error al cargar clientes');
            }
            const data = await response.json();
            setClientes(data);
            // Resetear a la primera página al cargar nuevos datos
            setPaginacion(prev => ({
                ...prev,
                clientes: {
                    ...prev.clientes,
                    pagina: 1
                }
            }));
        } catch (err) {
            console.error('Error al cargar clientes:', err);
            setError(prev => ({ ...prev, clientes: err.message }));
            showNotification('Error al cargar clientes: ' + err.message, 'error');
        } finally {
            setLoading(prev => ({ ...prev, clientes: false }));
        }
    };
    
    const fetchOperadores = async () => {
        try {
            setLoading(prev => ({ ...prev, operadores: true }));
            setError(prev => ({ ...prev, operadores: null }));
            const response = await fetch(`http://localhost:5000/api/catalogos/operadores?busqueda=${busquedaOperador}`);
            if (!response.ok) {
                throw new Error('Error al cargar operadores');
            }
            const data = await response.json();
            setOperadores(data);
            // Resetear a la primera página al cargar nuevos datos
            setPaginacion(prev => ({
                ...prev,
                operadores: {
                    ...prev.operadores,
                    pagina: 1
                }
            }));
        } catch (err) {
            console.error('Error al cargar operadores:', err);
            setError(prev => ({ ...prev, operadores: err.message }));
            showNotification('Error al cargar operadores: ' + err.message, 'error');
        } finally {
            setLoading(prev => ({ ...prev, operadores: false }));
        }
    };
    
    const fetchGruas = async () => {
        try {
            setLoading(prev => ({ ...prev, gruas: true }));
            setError(prev => ({ ...prev, gruas: null }));
            const response = await fetch(`http://localhost:5000/api/catalogos/gruas?busqueda=${busquedaGrua}`);
            if (!response.ok) {
                throw new Error('Error al cargar grúas');
            }
            const data = await response.json();
            setGruas(data);
            // Resetear a la primera página al cargar nuevos datos
            setPaginacion(prev => ({
                ...prev,
                gruas: {
                    ...prev.gruas,
                    pagina: 1
                }
            }));
        } catch (err) {
            console.error('Error al cargar grúas:', err);
            setError(prev => ({ ...prev, gruas: err.message }));
            showNotification('Error al cargar grúas: ' + err.message, 'error');
        } finally {
            setLoading(prev => ({ ...prev, gruas: false }));
        }
    };
    
    // Funciones para gestionar clientes
    const handleNuevoCliente = () => {
        setClienteSeleccionado(null);
        setModalCliente(true);
    };
    
    const handleEditarCliente = (cliente) => {
        setClienteSeleccionado(cliente);
        setModalCliente(true);
    };
    
    const handleEliminarCliente = (id) => {
        showConfirmation({
            title: 'Eliminar Cliente',
            message: '¿Está seguro que desea eliminar este cliente? Esta acción no se puede deshacer.',
            type: 'delete',
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    const response = await fetch(`http://localhost:5000/api/catalogos/clientes/${id}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Error al eliminar cliente');
                    }
                    // Actualiza el estado local eliminando el cliente
                    setClientes(prevClientes => prevClientes.filter(cliente => cliente.id_cliente !== id));
                    showNotification('Cliente eliminado exitosamente', 'success');
                } catch (err) {
                    console.error('Error al eliminar cliente:', err);
                    showNotification('Error al eliminar cliente: ' + err.message, 'error');
                }
            }
        });
    };
    
    const handleGuardarCliente = async (e) => {
        e.preventDefault();
        const form = document.getElementById('clienteForm');
        const formData = new FormData(form);
        const cliente = {
            id_cliente: formData.get('id_cliente'),
            nombre_cliente: formData.get('nombre_cliente'),
            tipo_convenio: formData.get('tipo_convenio'),
            banderazo: parseFloat(formData.get('banderazo')),
            costokm: parseFloat(formData.get('costokm')) || null,
            tipo_servicio: formData.get('tipo_servicio'),
            descripcion: formData.get('descripcion')
        };
        
        showConfirmation({
            title: clienteSeleccionado ? 'Actualizar Cliente' : 'Crear Cliente',
            message: clienteSeleccionado 
                ? `¿Está seguro que desea actualizar los datos del cliente "${cliente.nombre_cliente}"?`
                : `¿Está seguro que desea crear el cliente "${cliente.nombre_cliente}"?`,
            type: 'save',
            confirmText: clienteSeleccionado ? 'Actualizar' : 'Crear',
            onConfirm: async () => {
                try {
                    const method = clienteSeleccionado ? 'PUT' : 'POST';
                    const url = clienteSeleccionado 
                        ? `http://localhost:5000/api/catalogos/clientes/${clienteSeleccionado.id_cliente}`
                        : 'http://localhost:5000/api/catalogos/clientes';
                    
                    const response = await fetch(url, {
                        method,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(cliente)
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Error al guardar cliente');
                    }
                    
                    setModalCliente(false);
                    
                    // Si es una edición, actualiza el cliente en el estado local
                    if (clienteSeleccionado) {
                        setClientes(prevClientes => 
                            prevClientes.map(c => 
                                c.id_cliente === cliente.id_cliente ? { ...c, ...cliente } : c
                            )
                        );
                        showNotification('Cliente actualizado exitosamente', 'success');
                    } else {
                        // Si es nuevo, recarga todos los clientes
                        fetchClientes();
                        showNotification('Cliente creado exitosamente', 'success');
                    }
                } catch (err) {
                    console.error('Error al guardar cliente:', err);
                    showNotification('Error al guardar cliente: ' + err.message, 'error');
                }
            }
        });
    };
    
    // Funciones para gestionar operadores
    const handleNuevoOperador = () => {
        setOperadorSeleccionado(null);
        setModalOperador(true);
    };
    
    const handleEditarOperador = (operador) => {
        setOperadorSeleccionado(operador);
        setModalOperador(true);
    };
    
    const handleEliminarOperador = (id) => {
        showConfirmation({
            title: 'Eliminar Operador',
            message: '¿Está seguro que desea eliminar este operador? Esta acción no se puede deshacer.',
            type: 'delete',
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    const response = await fetch(`http://localhost:5000/api/catalogos/operadores/${id}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Error al eliminar operador');
                    }
                    // Actualiza el estado local eliminando el operador
                    setOperadores(prevOperadores => prevOperadores.filter(operador => operador.id_operador !== id));
                    // También actualiza las grúas que tenían este operador asignado
                    setGruas(prevGruas => prevGruas.map(grua => 
                        grua.id_operador === parseInt(id) ? {...grua, id_operador: null} : grua
                    ));
                    showNotification('Operador eliminado exitosamente', 'success');
                } catch (err) {
                    console.error('Error al eliminar operador:', err);
                    showNotification('Error al eliminar operador: ' + err.message, 'error');
                }
            }
        });
    };
    
    const handleGuardarOperador = async (e) => {
        e.preventDefault();
        const form = document.getElementById('operadorForm');
        const formData = new FormData(form);
        // Obtener datos del formulario
        const operador = {
            nombre: formData.get('nombre'),
            ap_paterno: formData.get('ap_paterno'),
            ap_materno: formData.get('ap_materno'),
            telefono: formData.get('telefono').replace(/\D/g, ''), // Eliminar caracteres no numéricos
            apikey_telefono: formData.get('apikey_telefono'),
            rol: formData.get('rol'),
            turno: formData.get('turno')
        };
        
        showConfirmation({
            title: operadorSeleccionado ? 'Actualizar Operador' : 'Crear Operador',
            message: operadorSeleccionado 
                ? `¿Está seguro que desea actualizar los datos del operador "${operador.nombre} ${operador.ap_paterno}"?`
                : `¿Está seguro que desea crear el operador "${operador.nombre} ${operador.ap_paterno}"?`,
            type: 'save',
            confirmText: operadorSeleccionado ? 'Actualizar' : 'Crear',
            onConfirm: async () => {
                try {
                    const method = operadorSeleccionado ? 'PUT' : 'POST';
                    const url = operadorSeleccionado 
                        ? `http://localhost:5000/api/catalogos/operadores/${operadorSeleccionado.id_operador}`
                        : 'http://localhost:5000/api/catalogos/operadores';
                    
                    const response = await fetch(url, {
                        method,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(operador)
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Error al guardar operador');
                    }
                    
                    setModalOperador(false);
                    
                    // Si es una edición, actualiza el operador en el estado local
                    if (operadorSeleccionado) {
                        setOperadores(prevOperadores => 
                            prevOperadores.map(op => 
                                op.id_operador === operadorSeleccionado.id_operador ? { ...op, ...operador } : op
                            )
                        );
                        showNotification('Operador actualizado exitosamente', 'success');
                    } else {
                        // Si es nuevo, recarga todos los operadores
                        fetchOperadores();
                        showNotification('Operador creado exitosamente', 'success');
                    }
                } catch (err) {
                    console.error('Error al guardar operador:', err);
                    showNotification('Error al guardar operador: ' + err.message, 'error');
                }
            }
        });
    };
    
    // Funciones para gestionar grúas
    const handleNuevaGrua = () => {
        setGruaSeleccionada(null);
        setModalGrua(true);
    };
    
    const handleEditarGrua = (grua) => {
        setGruaSeleccionada(grua);
        setModalGrua(true);
    };
    
    const handleEliminarGrua = (id) => {
        showConfirmation({
            title: 'Eliminar Grúa',
            message: '¿Está seguro que desea eliminar esta grúa? Esta acción no se puede deshacer.',
            type: 'delete',
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    const response = await fetch(`http://localhost:5000/api/catalogos/gruas/${id}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Error al eliminar grúa');
                    }
                    // Actualiza el estado local eliminando la grúa
                    setGruas(prevGruas => prevGruas.filter(grua => grua.id_grua !== id));
                    showNotification('Grúa eliminada exitosamente', 'success');
                } catch (err) {
                    console.error('Error al eliminar grúa:', err);
                    showNotification('Error al eliminar grúa: ' + err.message, 'error');
                }
            }
        });
    };
    
    const handleGuardarGrua = async (e) => {
        e.preventDefault();
        const form = document.getElementById('gruaForm');
        const formData = new FormData(form);
        const grua = {
            nombre: formData.get('nombre'),
            marca: formData.get('marca'),
            modelo: formData.get('modelo'),
            placas: formData.get('placas'),
            num_economico: formData.get('num_economico'),
            estado_emplacado: formData.get('estado_emplacado'),
            observaciones: formData.get('observaciones')
        };
        
        showConfirmation({
            title: gruaSeleccionada ? 'Actualizar Grúa' : 'Crear Grúa',
            message: gruaSeleccionada 
                ? `¿Está seguro que desea actualizar los datos de la grúa "${grua.nombre}"?`
                : `¿Está seguro que desea crear la grúa "${grua.nombre}"?`,
            type: 'save',
            confirmText: gruaSeleccionada ? 'Actualizar' : 'Crear',
            onConfirm: async () => {
                try {
                    const method = gruaSeleccionada ? 'PUT' : 'POST';
                    const url = gruaSeleccionada 
                        ? `http://localhost:5000/api/catalogos/gruas/${gruaSeleccionada.id_grua}`
                        : 'http://localhost:5000/api/catalogos/gruas';
                    
                    const response = await fetch(url, {
                        method,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(grua)
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Error al guardar grúa');
                    }
                    
                    setModalGrua(false);
                    
                    // Si es una edición, actualiza la grúa en el estado local
                    if (gruaSeleccionada) {
                        setGruas(prevGruas => 
                            prevGruas.map(g => 
                                g.id_grua === gruaSeleccionada.id_grua ? { ...g, ...grua, id_operador: g.id_operador } : g
                            )
                        );
                        showNotification('Grúa actualizada exitosamente', 'success');
                    } else {
                        // Si es nueva, recarga todas las grúas
                        fetchGruas();
                        showNotification('Grúa creada exitosamente', 'success');
                    }
                } catch (err) {
                    console.error('Error al guardar grúa:', err);
                    showNotification('Error al guardar grúa: ' + err.message, 'error');
                }
            }
        });
    };
    
    // Funciones para asignación de operadores a grúas
    const handleAsignarOperador = async (e) => {
        e.preventDefault();
        if (!gruaSeleccionadaAsignacion || !operadorSeleccionadoAsignacion) {
            showNotification('Debe seleccionar una grúa y un operador', 'warning');
            return;
        }
        
        showConfirmation({
            title: 'Asignar Operador',
            message: '¿Está seguro que desea asignar este operador a la grúa seleccionada?',
            type: 'save',
            confirmText: 'Asignar',
            onConfirm: async () => {
                try {
                    setLoadingAsignacion(true);
                    // Convertir a números enteros
                    const idGrua = parseInt(gruaSeleccionadaAsignacion);
                    const idOperador = parseInt(operadorSeleccionadoAsignacion);
                    
                    const response = await fetch('http://localhost:5000/api/catalogos/asignaciones', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            id_grua: idGrua,
                            id_operador: idOperador
                        })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Error al asignar operador');
                    }
                    
                    // Actualizar el estado local de las grúas
                    setGruas(prevGruas => prevGruas.map(grua => {
                        // Si es la grúa que estamos asignando
                        if (grua.id_grua === idGrua) {
                            return { ...grua, id_operador: idOperador };
                        }
                        // Si esta grúa tenía asignado el operador que estamos moviendo
                        if (grua.id_operador === idOperador) {
                            return { ...grua, id_operador: null };
                        }
                        return grua;
                    }));
                    
                    // Limpiar selección
                    setGruaSeleccionadaAsignacion('');
                    setOperadorSeleccionadoAsignacion('');
                    
                    // Recargar datos para asegurar consistencia
                    fetchGruas();
                    fetchOperadores();
                    
                    showNotification('Operador asignado exitosamente', 'success');
                } catch (err) {
                    console.error('Error:', err);
                    showNotification('Error al asignar operador: ' + err.message, 'error');
                } finally {
                    setLoadingAsignacion(false);
                }
            }
        });
    };
    
    const handleDesasignarOperador = (id_grua) => {
        showConfirmation({
            title: 'Desasignar Operador',
            message: '¿Está seguro que desea desasignar el operador de esta grúa?',
            type: 'warning',
            confirmText: 'Desasignar',
            onConfirm: async () => {
                try {
                    setLoadingAsignacion(true);
                    
                    const response = await fetch('http://localhost:5000/api/catalogos/desasignaciones', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ id_grua })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Error al desasignar operador');
                    }
                    
                    // Actualizar el estado local
                    setGruas(prevGruas => prevGruas.map(grua => {
                        if (grua.id_grua === id_grua) {
                            return { ...grua, id_operador: null };
                        }
                        return grua;
                    }));
                    
                    // Recargar datos para asegurar consistencia
                    fetchGruas();
                    fetchOperadores();
                    
                    showNotification('Operador desasignado exitosamente', 'success');
                } catch (err) {
                    console.error('Error:', err);
                    showNotification('Error al desasignar operador: ' + err.message, 'error');
                } finally {
                    setLoadingAsignacion(false);
                }
            }
        });
    };
    
    // Componente de paginación
    const Paginacion = ({ tipo }) => {
        const { pagina, totalPaginas, elementosPorPagina, total } = paginacion[tipo];
        // Calcular rango de elementos mostrados
        const inicio = (pagina - 1) * elementosPorPagina + 1;
        const fin = Math.min(pagina * elementosPorPagina, total);
        
        return (
            <div className={styles.paginationContainer}>
                <div className={styles.itemsPerPage}>
                    <span>Mostrar:</span>
                    <select 
                        value={elementosPorPagina}
                        onChange={(e) => cambiarElementosPorPagina(tipo, e.target.value)}
                    >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="30">30</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
                <div className={styles.pagination}>
                    <button 
                        className={`${styles.paginationBtn} ${pagina === 1 ? styles.disabled : ''}`}
                        onClick={() => cambiarPagina(tipo, 1)}
                        disabled={pagina === 1}
                    >
                        <i className="fas fa-angle-double-left"></i>
                    </button>
                    <button 
                        className={`${styles.paginationBtn} ${pagina === 1 ? styles.disabled : ''}`}
                        onClick={() => cambiarPagina(tipo, pagina - 1)}
                        disabled={pagina === 1}
                    >
                        <i className="fas fa-angle-left"></i>
                    </button>
                    {/* Mostrar números de página */}
                    {[...Array(totalPaginas)].map((_, i) => {
                        const pageNum = i + 1;
                        // Mostrar solo páginas cercanas a la actual
                        if (
                            pageNum === 1 || 
                            pageNum === totalPaginas || 
                            (pageNum >= pagina - 1 && pageNum <= pagina + 1)
                        ) {
                            return (
                                <button 
                                    key={pageNum}
                                    className={`${styles.paginationBtn} ${pageNum === pagina ? styles.active : ''}`}
                                    onClick={() => cambiarPagina(tipo, pageNum)}
                                >
                                    {pageNum}
                                </button>
                            );
                        } else if (
                            (pageNum === pagina - 2 && pagina > 3) || 
                            (pageNum === pagina + 2 && pagina < totalPaginas - 2)
                        ) {
                            return <span key={pageNum} className={styles.paginationEllipsis}>...</span>;
                        }
                        return null;
                    })}
                    <button 
                        className={`${styles.paginationBtn} ${pagina === totalPaginas ? styles.disabled : ''}`}
                        onClick={() => cambiarPagina(tipo, pagina + 1)}
                        disabled={pagina === totalPaginas}
                    >
                        <i className="fas fa-angle-right"></i>
                    </button>
                    <button 
                        className={`${styles.paginationBtn} ${pagina === totalPaginas ? styles.disabled : ''}`}
                        onClick={() => cambiarPagina(tipo, totalPaginas)}
                        disabled={pagina === totalPaginas}
                    >
                        <i className="fas fa-angle-double-right"></i>
                    </button>
                </div>
                <div className={styles.paginationInfo}>
                    Mostrando {inicio} a {fin} de {total} registros
                </div>
            </div>
        );
    };
    
    // Variantes para animaciones
    const fadeIn = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.5 } }
    };
    
    const slideUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };
    
    return (
        <div>
            <Head>
                <title>Catálogos - AMA Cuernavaca</title>
                <link rel="icon" href="/img/ico2.ico" type="image/x-icon" />
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
            </Head>
            
            {/* Sistema de notificaciones */}
            <div className={styles.notificationContainer}>
                <AnimatePresence>
                    {notifications.map(notification => (
                        <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 30 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Notification notification={notification} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            
            {/* Navbar */}
            <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
                <a className={styles.navbarBrand} href="#">
                    <img src="/img/logo.png" alt="Logo AMA" className={styles.modalLogo} />
                </a>
                <div 
                    className={`${styles.menuToggle} ${isMenuOpen ? styles.active : ''}`} 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <ul className={`${styles.navLinks} ${isMenuOpen ? styles.active : ''}`}>
                    <li><a href="#" onClick={handleSignOut}>Salir</a></li>
                </ul>
            </nav>
            
            {/* Encabezado de página */}
            <div className={styles.pageHeader}>
                <div className={styles.filter}></div>
                <motion.div 
                    className={styles.headerContent}
                    initial="hidden"
                    animate="visible"
                    variants={fadeIn}
                >
                    <motion.h1 
                        className={styles.presentationTitle}
                        variants={slideUp}
                    >
                        Catálogos
                    </motion.h1>
                </motion.div>
            </div>
            
            {/* Contenedor principal */}
            <motion.div 
                className={styles.catalogoContainer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Pestañas principales */}
                <div className={styles.mainTabs}>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === 'clientes' ? styles.active : ''}`}
                        onClick={() => setActiveTab('clientes')}
                    >
                        <i className="fas fa-users"></i> Clientes
                    </button>
                    <button 
                        className={`${styles.tabBtn} ${activeTab === 'operadores-gruas' ? styles.active : ''}`}
                        onClick={() => setActiveTab('operadores-gruas')}
                    >
                        <i className="fas fa-truck-pickup"></i> Operadores y Grúas
                    </button>
                </div>
                
                {/* Contenido de pestañas */}
                <AnimatePresence mode="wait">
                    <motion.div 
                        className={styles.tabContent}
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Pestaña de Clientes */}
                        {activeTab === 'clientes' && (
                            <div className={styles.tabPane}>
                                <div className={styles.tabHeader}>
                                    <h2><i className="fas fa-users"></i> Gestión de Clientes</h2>
                                    <div className={styles.actions}>
                                        <div className={styles.searchBox}>
                                            <input 
                                                type="text" 
                                                placeholder="Buscar cliente..." 
                                                value={busquedaCliente}
                                                onChange={(e) => setBusquedaCliente(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && fetchClientes()}
                                            />
                                            <button onClick={fetchClientes}>
                                                <i className="fas fa-search"></i>
                                            </button>
                                        </div>
                                        <motion.button 
                                            className={styles.btnAdd} 
                                            onClick={handleNuevoCliente}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <i className="fas fa-plus"></i> Nuevo Cliente
                                        </motion.button>
                                    </div>
                                </div>
                                
                                {/* Tabla de clientes */}
                                {loading.clientes ? (
                                    <motion.div 
                                        className={styles.loading}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <i className="fas fa-spinner fa-spin"></i> 
                                        <span>Cargando clientes...</span>
                                    </motion.div>
                                ) : error.clientes ? (
                                    <motion.div 
                                        className={styles.errorMessage}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <i className="fas fa-exclamation-circle"></i> {error.clientes}
                                        <button onClick={fetchClientes} className={styles.retryButton}>
                                            <i className="fas fa-redo"></i> Reintentar
                                        </button>
                                    </motion.div>
                                ) : clientes.length === 0 ? (
                                    <motion.div 
                                        className={styles.noData}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        No hay clientes disponibles
                                    </motion.div>
                                ) : (
                                    <>
                                        <div className={styles.tableContainer}>
                                            <table className={styles.dataTable}>
                                                <thead>
                                                    <tr>
                                                        <th>ID</th>
                                                        <th>Nombre</th>
                                                        <th>Tipo de Convenio</th>
                                                        <th>Banderazo</th>
                                                        <th>Costo por KM</th>
                                                        <th>Tipo de Servicio</th>
                                                        <th>Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {clientesPaginados.map((cliente, index) => (
                                                        <motion.tr 
                                                            key={`${cliente.id_cliente}-${cliente.tipo_convenio}-${cliente.banderazo}`}
                                                            initial={{ opacity: 0, y: 20 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.05, duration: 0.3 }}
                                                        >
                                                            <td>{cliente.id_cliente}</td>
                                                            <td>{cliente.nombre_cliente}</td>
                                                            <td>{cliente.tipo_convenio}</td>
                                                            <td>${cliente.banderazo}</td>
                                                            <td>${cliente.costokm || '0.00'}</td>
                                                            <td>{cliente.tipo_servicio || '-'}</td>
                                                            <td className={styles.actionsCell}>
                                                                <motion.button 
                                                                    className={`${styles.btnIcon} ${styles.btnEdit}`} 
                                                                    onClick={() => handleEditarCliente(cliente)}
                                                                    title="Editar"
                                                                    whileHover={{ scale: 1.2 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                >
                                                                    <i className="fas fa-edit"></i>
                                                                </motion.button>
                                                                <motion.button 
                                                                    className={`${styles.btnIcon} ${styles.btnDelete}`} 
                                                                    onClick={() => handleEliminarCliente(cliente.id_cliente)}
                                                                    title="Eliminar"
                                                                    whileHover={{ scale: 1.2 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                >
                                                                    <i className="fas fa-trash-alt"></i>
                                                                </motion.button>
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* Paginación para clientes */}
                                        <Paginacion tipo="clientes" />
                                    </>
                                )}
                            </div>
                        )}
                        
                        {/* Pestaña de Operadores y Grúas */}
                        {activeTab === 'operadores-gruas' && (
                            <div className={styles.tabPane}>
                                {/* Sub-pestañas */}
                                <div className={styles.subTabs}>
                                    <button 
                                        className={`${styles.subTabBtn} ${activeSubTab === 'operadores' ? styles.active : ''}`}
                                        onClick={() => setActiveSubTab('operadores')}
                                    >
                                        <i className="fas fa-hard-hat"></i> Operadores
                                    </button>
                                    <button 
                                        className={`${styles.subTabBtn} ${activeSubTab === 'gruas' ? styles.active : ''}`}
                                        onClick={() => setActiveSubTab('gruas')}
                                    >
                                        <i className="fas fa-truck-pickup"></i> Grúas
                                    </button>
                                    <button 
                                        className={`${styles.subTabBtn} ${activeSubTab === 'asignacion' ? styles.active : ''}`}
                                        onClick={() => setActiveSubTab('asignacion')}
                                    >
                                        <i className="fas fa-link"></i> Asignación
                                    </button>
                                </div>
                                
                                {/* Contenido de sub-pestañas */}
                                <AnimatePresence mode="wait">
                                    <motion.div 
                                        className={styles.subTabContent}
                                        key={activeSubTab}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {/* Sub-pestaña de Operadores */}
                                        {activeSubTab === 'operadores' && (
                                            <div className={styles.subTabPane}>
                                                <div className={styles.tabHeader}>
                                                    <h3><i className="fas fa-hard-hat"></i> Gestión de Operadores</h3>
                                                    <div className={styles.actions}>
                                                        <div className={styles.searchBox}>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Buscar operador..." 
                                                                value={busquedaOperador}
                                                                onChange={(e) => setBusquedaOperador(e.target.value)}
                                                                onKeyPress={(e) => e.key === 'Enter' && fetchOperadores()}
                                                            />
                                                            <button onClick={fetchOperadores}>
                                                                <i className="fas fa-search"></i>
                                                            </button>
                                                        </div>
                                                        <motion.button 
                                                            className={styles.btnAdd} 
                                                            onClick={handleNuevoOperador}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <i className="fas fa-plus"></i> Nuevo Operador
                                                        </motion.button>
                                                    </div>
                                                </div>
                                                
                                                {/* Tabla de operadores */}
                                                {loading.operadores ? (
                                                    <div className={styles.loading}>
                                                        <i className="fas fa-spinner fa-spin"></i> 
                                                        <span>Cargando operadores...</span>
                                                    </div>
                                                ) : error.operadores ? (
                                                    <div className={styles.errorMessage}>
                                                        <i className="fas fa-exclamation-circle"></i> {error.operadores}
                                                        <button onClick={fetchOperadores} className={styles.retryButton}>
                                                            <i className="fas fa-redo"></i> Reintentar
                                                        </button>
                                                    </div>
                                                ) : operadores.length === 0 ? (
                                                    <div className={styles.noData}>
                                                        No hay operadores disponibles
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className={styles.tableContainer}>
                                                            <table className={styles.dataTable}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>ID</th>
                                                                        <th>Nombre</th>
                                                                        <th>Apellido Paterno</th>
                                                                        <th>Apellido Materno</th>
                                                                        <th>Teléfono</th>
                                                                        <th>API Key</th>
                                                                        <th>Rol</th>
                                                                        <th>Turno</th>
                                                                        <th>Grúa Asignada</th>
                                                                        <th>Acciones</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {operadoresPaginados.map((operador, index) => (
                                                                        <motion.tr 
                                                                            key={operador.id_operador}
                                                                            initial={{ opacity: 0, y: 20 }}
                                                                            animate={{ opacity: 1, y: 0 }}
                                                                            transition={{ delay: index * 0.05, duration: 0.3 }}
                                                                        >
                                                                            <td>{operador.id_operador}</td>
                                                                            <td>{operador.nombre}</td>
                                                                            <td>{operador.ap_paterno}</td>
                                                                            <td>{operador.ap_materno || '-'}</td>
                                                                            <td>{operador.telefono}</td>
                                                                            <td>{operador.apikey_telefono || '-'}</td>
                                                                            <td>{operador.rol}</td>
                                                                            <td>{operador.turno}</td>
                                                                            <td>
                                                                                {(() => {
                                                                                    const grua = gruas.find(g => g.id_operador === operador.id_operador);
                                                                                    return grua ? `${grua.nombre} (${grua.placas})` : 'No asignada';
                                                                                })()}
                                                                            </td>
                                                                            <td className={styles.actionsCell}>
                                                                                <motion.button 
                                                                                    className={`${styles.btnIcon} ${styles.btnEdit}`} 
                                                                                    onClick={() => handleEditarOperador(operador)}
                                                                                    title="Editar"
                                                                                    whileHover={{ scale: 1.2 }}
                                                                                    whileTap={{ scale: 0.9 }}
                                                                                >
                                                                                    <i className="fas fa-edit"></i>
                                                                                </motion.button>
                                                                                <motion.button 
                                                                                    className={`${styles.btnIcon} ${styles.btnDelete}`} 
                                                                                    onClick={() => handleEliminarOperador(operador.id_operador)}
                                                                                    title="Eliminar"
                                                                                    whileHover={{ scale: 1.2 }}
                                                                                    whileTap={{ scale: 0.9 }}
                                                                                >
                                                                                    <i className="fas fa-trash-alt"></i>
                                                                                </motion.button>
                                                                            </td>
                                                                        </motion.tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        {/* Paginación para operadores */}
                                                        <Paginacion tipo="operadores" />
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Sub-pestaña de Grúas */}
                                        {activeSubTab === 'gruas' && (
                                            <div className={styles.subTabPane}>
                                                <div className={styles.tabHeader}>
                                                    <h3><i className="fas fa-truck-pickup"></i> Gestión de Grúas</h3>
                                                    <div className={styles.actions}>
                                                        <div className={styles.searchBox}>
                                                            <input 
                                                                type="text" 
                                                                placeholder="Buscar grúa..." 
                                                                value={busquedaGrua}
                                                                onChange={(e) => setBusquedaGrua(e.target.value)}
                                                                onKeyPress={(e) => e.key === 'Enter' && fetchGruas()}
                                                            />
                                                            <button onClick={fetchGruas}>
                                                                <i className="fas fa-search"></i>
                                                            </button>
                                                        </div>
                                                        <motion.button 
                                                            className={styles.btnAdd} 
                                                            onClick={handleNuevaGrua}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                        >
                                                            <i className="fas fa-plus"></i> Nueva Grúa
                                                        </motion.button>
                                                    </div>
                                                </div>
                                                
                                                {/* Tabla de grúas */}
                                                {loading.gruas ? (
                                                    <div className={styles.loading}>
                                                        <i className="fas fa-spinner fa-spin"></i> 
                                                        <span>Cargando grúas...</span>
                                                    </div>
                                                ) : error.gruas ? (
                                                    <div className={styles.errorMessage}>
                                                        <i className="fas fa-exclamation-circle"></i> {error.gruas}
                                                        <button onClick={fetchGruas} className={styles.retryButton}>
                                                            <i className="fas fa-redo"></i> Reintentar
                                                        </button>
                                                    </div>
                                                ) : gruas.length === 0 ? (
                                                    <div className={styles.noData}>
                                                        No hay grúas disponibles
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className={styles.tableContainer}>
                                                            <table className={styles.dataTable}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>ID</th>
                                                                        <th>Nombre</th>
                                                                        <th>Marca</th>
                                                                        <th>Modelo</th>
                                                                        <th>Placas</th>
                                                                        <th>Núm. Económico</th>
                                                                        <th>Operador Asignado</th>
                                                                        <th>Acciones</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {gruasPaginadas.map((grua, index) => {
                                                                        const operadorAsignado = operadores.find(op => op.id_operador === grua.id_operador);
                                                                        return (
                                                                            <motion.tr 
                                                                                key={grua.id_grua}
                                                                                initial={{ opacity: 0, y: 20 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                transition={{ delay: index * 0.05, duration: 0.3 }}
                                                                            >
                                                                                <td>{grua.id_grua}</td>
                                                                                <td>{grua.nombre}</td>
                                                                                <td>{grua.marca}</td>
                                                                                <td>{grua.modelo}</td>
                                                                                <td>{grua.placas}</td>
                                                                                <td>{grua.num_economico}</td>
                                                                                <td>
                                                                                    {operadorAsignado ? 
                                                                                        `${operadorAsignado.nombre} ${operadorAsignado.ap_paterno}` : 
                                                                                        'No asignado'}
                                                                                </td>
                                                                                <td className={styles.actionsCell}>
                                                                                    <motion.button 
                                                                                        className={`${styles.btnIcon} ${styles.btnEdit}`} 
                                                                                        onClick={() => handleEditarGrua(grua)}
                                                                                        title="Editar"
                                                                                        whileHover={{ scale: 1.2 }}
                                                                                        whileTap={{ scale: 0.9 }}
                                                                                    >
                                                                                        <i className="fas fa-edit"></i>
                                                                                    </motion.button>
                                                                                    <motion.button 
                                                                                        className={`${styles.btnIcon} ${styles.btnDelete}`} 
                                                                                        onClick={() => handleEliminarGrua(grua.id_grua)}
                                                                                        title="Eliminar"
                                                                                        whileHover={{ scale: 1.2 }}
                                                                                        whileTap={{ scale: 0.9 }}
                                                                                    >
                                                                                        <i className="fas fa-trash-alt"></i>
                                                                                    </motion.button>
                                                                                </td>
                                                                            </motion.tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        {/* Paginación para grúas */}
                                                        <Paginacion tipo="gruas" />
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Sub-pestaña de Asignación */}
                                        {activeSubTab === 'asignacion' && (
                                            <div className={styles.subTabPane}>
                                                <div className={styles.tabHeader}>
                                                    <h3><i className="fas fa-link"></i> Asignación de Operadores a Grúas</h3>
                                                </div>
                                                <motion.div 
                                                    className={styles.asignacionContainer}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.5 }}
                                                >
                                                    <motion.div 
                                                        className={styles.asignacionForm}
                                                        whileHover={{ boxShadow: "0 8px 20px rgba(0,0,0,0.15)" }}
                                                    >
                                                        <form onSubmit={handleAsignarOperador}>
                                                            <div className={styles.formGroup}>
                                                                <label>Seleccionar Grúa:</label>
                                                                <select 
                                                                    className={styles.formControl}
                                                                    value={gruaSeleccionadaAsignacion}
                                                                    onChange={(e) => setGruaSeleccionadaAsignacion(e.target.value)}
                                                                    required
                                                                >
                                                                    <option value="">-- Seleccione una grúa --</option>
                                                                    {gruas.map(grua => {
                                                                        // Verificar si la grúa ya tiene operador asignado
                                                                        const operadorAsignado = operadores.find(op => op.id_operador === grua.id_operador);
                                                                        return (
                                                                            <option 
                                                                                key={grua.id_grua} 
                                                                                value={grua.id_grua}
                                                                            >
                                                                                {grua.nombre} - {grua.marca} {grua.modelo} ({grua.placas})
                                                                                {operadorAsignado ? ` - Asignada a: ${operadorAsignado.nombre}` : ''}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            </div>
                                                            <div className={styles.formGroup}>
                                                                <label>Asignar Operador:</label>
                                                                <select 
                                                                    className={styles.formControl}
                                                                    value={operadorSeleccionadoAsignacion}
                                                                    onChange={(e) => setOperadorSeleccionadoAsignacion(e.target.value)}
                                                                    required
                                                                >
                                                                    <option value="">-- Seleccione un operador --</option>
                                                                    {operadores.map(operador => {
                                                                        // Encontrar si este operador está asignado a alguna grúa
                                                                        const gruaAsignada = gruas.find(g => g.id_operador === operador.id_operador);
                                                                        return (
                                                                            <option 
                                                                                key={operador.id_operador} 
                                                                                value={operador.id_operador}
                                                                            >
                                                                                {operador.nombre} {operador.ap_paterno} - {operador.rol}
                                                                                {gruaAsignada ? ` - Asignado a: ${gruaAsignada.nombre}` : ''}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            </div>
                                                            <motion.button 
                                                                type="submit" 
                                                                className={styles.btnAsignar}
                                                                disabled={loadingAsignacion}
                                                                whileHover={{ scale: 1.03 }}
                                                                whileTap={{ scale: 0.97 }}
                                                            >
                                                                {loadingAsignacion ? (
                                                                    <><i className="fas fa-spinner fa-spin"></i> Procesando...</>
                                                                ) : (
                                                                    <><i className="fas fa-link"></i> Asignar</>
                                                                )}
                                                            </motion.button>
                                                        </form>
                                                    </motion.div>
                                                    <motion.div 
                                                        className={styles.asignacionesActuales}
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ duration: 0.5, delay: 0.2 }}
                                                    >
                                                        <h4>Asignaciones Actuales</h4>
                                                        {gruas.filter(g => g.id_operador).length === 0 ? (
                                                            <div className={styles.noData}>
                                                                No hay asignaciones activas
                                                            </div>
                                                        ) : (
                                                            <div className={styles.tableContainer}>
                                                                <table className={styles.dataTable}>
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Grúa</th>
                                                                            <th>Operador</th>
                                                                            <th>Teléfono</th>
                                                                            <th>Acciones</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {gruas.filter(g => g.id_operador).map((grua, index) => {
                                                                            const operador = operadores.find(op => op.id_operador === grua.id_operador);
                                                                            if (!operador) return null;
                                                                            return (
                                                                                <motion.tr 
                                                                                    key={`asignacion-${grua.id_grua}`}
                                                                                    initial={{ opacity: 0, y: 10 }}
                                                                                    animate={{ opacity: 1, y: 0 }}
                                                                                    transition={{ delay: index * 0.1, duration: 0.3 }}
                                                                                >
                                                                                    <td>{grua.nombre} - {grua.placas}</td>
                                                                                    <td>{operador.nombre} {operador.ap_paterno}</td>
                                                                                    <td>{operador.telefono}</td>
                                                                                    <td className={styles.actionsCell}>
                                                                                        <motion.button 
                                                                                            className={`${styles.btnIcon} ${styles.btnDelete}`} 
                                                                                            title="Desasignar"
                                                                                            onClick={() => handleDesasignarOperador(grua.id_grua)}
                                                                                            disabled={loadingAsignacion}
                                                                                            whileHover={{ scale: 1.2, rotate: 90 }}
                                                                                            whileTap={{ scale: 0.9 }}
                                                                                        >
                                                                                            {loadingAsignacion ? (
                                                                                                <i className="fas fa-spinner fa-spin"></i>
                                                                                            ) : (
                                                                                                <i className="fas fa-unlink"></i>
                                                                                            )}
                                                                                        </motion.button>
                                                                                    </td>
                                                                                </motion.tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                </motion.div>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
            
            {/* Modales para crear/editar */}
            <AnimatePresence>
                {modalCliente && (
                    <motion.div 
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            className={styles.modalContent}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", damping: 20 }}
                        >
                            <div className={styles.modalHeader}>
                                <h3>{clienteSeleccionado ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                                <motion.button 
                                    className={styles.closeBtn} 
                                    onClick={() => setModalCliente(false)}
                                    whileHover={{ rotate: 90 }}
                                >
                                    <i className="fas fa-times"></i>
                                </motion.button>
                            </div>
                            <div className={styles.modalBody}>
                                {/* Formulario de cliente */}
                                <form id="clienteForm" onSubmit={handleGuardarCliente}>
                                    <div className={styles.formGroup}>
                                        <label>ID Cliente:</label>
                                        <input 
                                            type="text" 
                                            name="id_cliente"
                                            className={styles.formControl}
                                            defaultValue={clienteSeleccionado?.id_cliente || ''}
                                            required
                                            readOnly={!!clienteSeleccionado}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Nombre del Cliente:</label>
                                        <input 
                                            type="text" 
                                            name="nombre_cliente"
                                            className={styles.formControl}
                                            defaultValue={clienteSeleccionado?.nombre_cliente || ''}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Tipo de Convenio:</label>
                                        <select 
                                            name="tipo_convenio"
                                            className={styles.formControl}
                                            defaultValue={clienteSeleccionado?.tipo_convenio || ''}
                                            required
                                        >
                                            <option value="">-- Seleccione --</option>
                                            <option value="Local">Local</option>
                                            <option value="Foraneo">Foráneo</option>
                                            <option value="Vial">Vial</option>
                                            <option value="Convenio">Convenio</option>
                                        </select>
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={`${styles.formGroup} ${styles.half}`}>
                                            <label>Banderazo ($):</label>
                                            <input 
                                                type="number" 
                                                name="banderazo"
                                                className={styles.formControl}
                                                defaultValue={clienteSeleccionado?.banderazo || ''}
                                                min="0"
                                                step="0.01"
                                                required
                                            />
                                        </div>
                                        <div className={`${styles.formGroup} ${styles.half}`}>
                                            <label>Costo por KM ($):</label>
                                            <input 
                                                type="number" 
                                                name="costokm"
                                                className={styles.formControl}
                                                defaultValue={clienteSeleccionado?.costokm || ''}
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Tipo de Servicio:</label>
                                        <select 
                                            name="tipo_servicio"
                                            className={styles.formControl}
                                            defaultValue={clienteSeleccionado?.tipo_servicio || ''}
                                        >
                                            <option value="">-- Seleccione --</option>
                                            <option value="Local">Local</option>
                                            <option value="Foraneo">Foráneo</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Descripción:</label>
                                        <textarea 
                                            name="descripcion"
                                            className={styles.formControl}
                                            defaultValue={clienteSeleccionado?.descripcion || ''}
                                            rows="3"
                                        ></textarea>
                                    </div>
                                    <div className={styles.formActions}>
                                        <motion.button 
                                            type="button" 
                                            className={styles.btnCancel} 
                                            onClick={() => setModalCliente(false)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <i className="fas fa-times"></i> Cancelar
                                        </motion.button>
                                        <motion.button 
                                            type="submit" 
                                            className={styles.btnSave}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <i className="fas fa-save"></i> Guardar
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                
                {modalOperador && (
                    <motion.div 
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            className={styles.modalContent}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", damping: 20 }}
                        >
                            <div className={styles.modalHeader}>
                                <h3>{operadorSeleccionado ? 'Editar Operador' : 'Nuevo Operador'}</h3>
                                <motion.button 
                                    className={styles.closeBtn} 
                                    onClick={() => setModalOperador(false)}
                                    whileHover={{ rotate: 90 }}
                                >
                                    <i className="fas fa-times"></i>
                                </motion.button>
                            </div>
                            <div className={styles.modalBody}>
                                {/* Formulario de operador */}
                                <form id="operadorForm" onSubmit={handleGuardarOperador}>
                                    <div className={styles.formGroup}>
                                        <label>Nombre:</label>
                                        <input 
                                            type="text" 
                                            name="nombre"
                                            className={styles.formControl}
                                            defaultValue={operadorSeleccionado?.nombre || ''}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={`${styles.formGroup} ${styles.half}`}>
                                            <label>Apellido Paterno:</label>
                                            <input 
                                                type="text" 
                                                name="ap_paterno"
                                                className={styles.formControl}
                                                defaultValue={operadorSeleccionado?.ap_paterno || ''}
                                                required
                                            />
                                        </div>
                                        <div className={`${styles.formGroup} ${styles.half}`}>
                                            <label>Apellido Materno:</label>
                                            <input 
                                                type="text" 
                                                name="ap_materno"
                                                className={styles.formControl}
                                                defaultValue={operadorSeleccionado?.ap_materno || ''}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Teléfono:</label>
                                        <input 
                                            type="tel" 
                                            name="telefono"
                                            className={styles.formControl}
                                            defaultValue={operadorSeleccionado?.telefono || ''}
                                            pattern="[0-9]{12,13}"
                                            placeholder="12 o 13 dígitos (sin espacios ni símbolos)"
                                            required
                                        />
                                        <small className={styles.formText}>
                                            Ingresa solo los 7 dígitos para CallMeBot
                                        </small>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>API Key para CallMeBot:</label>
                                        <input 
                                            type="text" 
                                            name="apikey_telefono"
                                            className={styles.formControl}
                                            defaultValue={operadorSeleccionado?.apikey_telefono || ''}
                                            placeholder="API Key para WhatsApp"
                                        />
                                        <small className={styles.formText}>
                                            Clave API para envío de mensajes por WhatsApp
                                        </small>
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={`${styles.formGroup} ${styles.half}`}>
                                            <label>Rol:</label>
                                            <select 
                                                name="rol"
                                                className={styles.formControl}
                                                defaultValue={operadorSeleccionado?.rol || ''}
                                                required
                                            >
                                                <option value="">-- Seleccione --</option>
                                                <option value="Operador">Operador</option>
                                                <option value="Supervisor">Supervisor</option>
                                                <option value="Administrador">Administrador</option>
                                            </select>
                                        </div>
                                        <div className={`${styles.formGroup} ${styles.half}`}>
                                            <label>Turno:</label>
                                            <select 
                                                name="turno"
                                                className={styles.formControl}
                                                defaultValue={operadorSeleccionado?.turno || ''}
                                                required
                                            >
                                                <option value="">-- Seleccione --</option>
                                                <option value="Matutino">Matutino</option>
                                                <option value="Vespertino">Vespertino</option>
                                                <option value="Nocturno">Nocturno</option>
                                                <option value="24 horas">24 horas</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className={styles.formActions}>
                                        <motion.button 
                                            type="button" 
                                            className={styles.btnCancel} 
                                            onClick={() => setModalOperador(false)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <i className="fas fa-times"></i> Cancelar
                                        </motion.button>
                                        <motion.button 
                                            type="submit" 
                                            className={styles.btnSave}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <i className="fas fa-save"></i> Guardar
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                
                {modalGrua && (
                    <motion.div 
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            className={styles.modalContent}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", damping: 20 }}
                        >
                            <div className={styles.modalHeader}>
                                <h3>{gruaSeleccionada ? 'Editar Grúa' : 'Nueva Grúa'}</h3>
                                <motion.button 
                                    className={styles.closeBtn} 
                                    onClick={() => setModalGrua(false)}
                                    whileHover={{ rotate: 90 }}
                                >
                                    <i className="fas fa-times"></i>
                                </motion.button>
                            </div>
                            <div className={styles.modalBody}>
                                {/* Formulario de grúa */}
                                <form id="gruaForm" onSubmit={handleGuardarGrua}>
                                    <div className={styles.formGroup}>
                                        <label>Nombre:</label>
                                        <input 
                                            type="text" 
                                            name="nombre"
                                            className={styles.formControl}
                                            defaultValue={gruaSeleccionada?.nombre || ''}
                                            required
                                        />
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={`${styles.formGroup} ${styles.half}`}>
                                            <label>Marca:</label>
                                            <input 
                                                type="text" 
                                                name="marca"
                                                className={styles.formControl}
                                                defaultValue={gruaSeleccionada?.marca || ''}
                                                required
                                            />
                                        </div>
                                        <div className={`${styles.formGroup} ${styles.half}`}>
                                            <label>Modelo:</label>
                                            <input 
                                                type="text" 
                                                name="modelo"
                                                className={styles.formControl}
                                                defaultValue={gruaSeleccionada?.modelo || ''}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={`${styles.formGroup} ${styles.half}`}>
                                            <label>Placas:</label>
                                            <input 
                                                type="text" 
                                                name="placas"
                                                className={styles.formControl}
                                                defaultValue={gruaSeleccionada?.placas || ''}
                                                required
                                            />
                                        </div>
                                        <div className={`${styles.formGroup} ${styles.half}`}>
                                            <label>Número Económico:</label>
                                            <input 
                                                type="text" 
                                                name="num_economico"
                                                className={styles.formControl}
                                                defaultValue={gruaSeleccionada?.num_economico || ''}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Estado de Emplacado:</label>
                                        <select 
                                            name="estado_emplacado"
                                            className={styles.formControl}
                                            defaultValue={gruaSeleccionada?.estado_emplacado || ''}
                                            required
                                        >
                                            <option value="">-- Seleccione --</option>
                                            <option value="Morelos">Morelos</option>
                                            <option value="Ciudad de México">Ciudad de México</option>
                                            <option value="Estado de México">Estado de México</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Observaciones:</label>
                                        <textarea 
                                            name="observaciones"
                                            className={styles.formControl}
                                            defaultValue={gruaSeleccionada?.observaciones || ''}
                                            rows="3"
                                        ></textarea>
                                    </div>
                                    <div className={styles.formActions}>
                                        <motion.button 
                                            type="button" 
                                            className={styles.btnCancel} 
                                            onClick={() => setModalGrua(false)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <i className="fas fa-times"></i> Cancelar
                                        </motion.button>
                                        <motion.button 
                                            type="submit" 
                                            className={styles.btnSave}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <i className="fas fa-save"></i> Guardar
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Modal de confirmación */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <ConfirmationModal
                        isOpen={confirmModal.isOpen}
                        onClose={closeConfirmation}
                        onConfirm={confirmModal.onConfirm}
                        title={confirmModal.title}
                        message={confirmModal.message}
                        type={confirmModal.type}
                        confirmText={confirmModal.confirmText}
                        cancelText={confirmModal.cancelText}
                    />
                )}
            </AnimatePresence>
            
            {/* Footer */}
            <footer className={styles.footer}>
                {user && (
                    <motion.div 
                        className={styles.footerContent}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        <p className={styles.userInfo}>
                            <i className="fas fa-user"></i> {user.displayName || 'Nombre no disponible'}
                        </p>
                        <p className={styles.userEmail}>
                            <i className="fas fa-envelope"></i> {user.email}
                        </p>
                    </motion.div>
                )}
            </footer>
        </div>
    );
};
export default function CatalogosPage() {
    return (
        <ProtectedRoute adminOnly>
            <Catalogos />
        </ProtectedRoute>
    );
}