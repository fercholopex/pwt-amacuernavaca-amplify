import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import styles from '@/styles/stylesmds/_modalcotizaciones.module.css';
// Importar los servicios de WhatsApp
import {
  enviarMensajeWhatsApp,
  crearMensajeServicioAsignado,
  crearMensajeInicioServicio,
  crearMensajeRecordatorio,
  crearMensajeReasignacion,
  crearMensajeServicioCompletado,
  crearMensajeCancelacion
} from '../services/whatsapp';
interface Cotizacion {
  id_cotizacion: number;
  n_folio: string;
  tipo_servicio: string;
  estado: string;
  fecha_creacion: string;
  hora_creacion: string;
  id_cliente: number;
  nombre_cliente: string;
  as_nombre: string;
  as_rfc: string;
  as_telefono: string;
  marca: string;
  modelo: string;
  anio: string;
  color: string;
  placas: string;
  direccion_origen: string;
  referencias_origen: string;
  direccion_destino: string;
  referencias_destino: string;
  operador_id?: number;
  fecha_asignacion?: string;
  fecha_inicio?: string;
  fecha_completado?: string;
  fecha_cancelacion?: string;
  total?: string;
  total_con_iva?: string;
  costo_adicional?: string;
  costo_asegurado?: string;
  num_casetas?: string;
  costo_casetas?: string;
  n_poliza?: string;
}
interface Operador {
  id_operador: number;
  nombre: string;
  ap_paterno: string;
  ap_materno?: string;
  telefono?: string;
  apikey_telefono?: string;
}
interface CostDetails {
  costoAdicional: number;
  costoAsegurado: number;
  numeroCasetas: number;
  costoCasetas: number;
}
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacion: Cotizacion;
  operadores: Operador[];
  onAsignar: (operadorId: string) => Promise<void>;
  onIniciar: () => Promise<void>;
  onCancelar: () => Promise<void>;
  onCompletar: (costDetails: CostDetails, total: number) => Promise<void>;
  onReasignarOperador: (nuevoOperadorId: string) => Promise<void>;
  onRecordarOperador: () => Promise<void>;
}
interface HistorialEvento {
  tipo: string;
  titulo: string;
  fecha: string;
  descripcion: string;
}
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  cotizacion,
  operadores,
  onAsignar,
  onIniciar,
  onCancelar,
  onCompletar,
  onReasignarOperador,
  onRecordarOperador,
}) => {
  const [selectedOperador, setSelectedOperador] = useState<string>('');
  const [animate, setAnimate] = useState<boolean>(false);
  const [poliza, setPoliza] = useState<string>('');
  const [confirmPoliza, setConfirmPoliza] = useState<string>('');
  const [isPolizaConfirmed, setIsPolizaConfirmed] = useState<boolean>(false);
  const [costDetails, setCostDetails] = useState<CostDetails>({
    costoAdicional: 0,
    costoAsegurado: 0,
    numeroCasetas: 0,
    costoCasetas: 0,
  });
  const [isCostConfirmed, setIsCostConfirmed] = useState<boolean>(false);
  const [operadorConfirmado, setOperadorConfirmado] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState<string>('detalles');
  const [enviandoMensaje, setEnviandoMensaje] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('asignar');
  const [showReasignarModal, setShowReasignarModal] = useState<boolean>(false);
  const [historialEventos, setHistorialEventos] = useState<HistorialEvento[]>([]);
  const [costoOriginal, setCostoOriginal] = useState<number>(0);
  useEffect(() => {
    // Cargar costos originales de la cotización
    if (cotizacion) {
      setCostoOriginal(parseFloat(cotizacion.total || '0'));
      setCostDetails({
        costoAdicional: parseFloat(cotizacion.costo_adicional || '0'),
        costoAsegurado: parseFloat(cotizacion.costo_asegurado || '0'),
        numeroCasetas: parseInt(cotizacion.num_casetas || '0'),
        costoCasetas: parseFloat(cotizacion.costo_casetas || '0'),
      });
      // Si ya tiene número de póliza, establecerlo
      if (cotizacion.n_poliza) {
        setPoliza(cotizacion.n_poliza);
        setConfirmPoliza(cotizacion.n_poliza);
        setIsPolizaConfirmed(true);
      }
    }
  }, [cotizacion]);
  useEffect(() => {
    // Generar historial basado en el estado actual
    const generarHistorial = (): HistorialEvento[] => {
      const eventos: HistorialEvento[] = [];
      // Evento de creación siempre existe
      eventos.push({
        tipo: 'creado',
        titulo: 'Servicio Creado',
        fecha: new Date(cotizacion.fecha_creacion || Date.now() - 86400000).toLocaleString(),
        descripcion: `Servicio #${cotizacion.n_folio} creado en el sistema.`
      });
      // Si tiene operador asignado
      if (cotizacion.operador_id) {
        const operador = operadores.find(op => op.id_operador.toString() === cotizacion.operador_id?.toString());
        eventos.push({
          tipo: 'asignado',
          titulo: 'Operador Asignado',
          fecha: new Date(cotizacion.fecha_asignacion || Date.now() - 43200000).toLocaleString(),
          descripcion: `Se asignó el servicio al operador ${operador?.nombre || ''} ${operador?.ap_paterno || ''}.`
        });
      }
      // Si está en progreso o completado
      if (['En Progreso', 'Iniciado', 'Completado'].includes(cotizacion.estado)) {
        eventos.push({
          tipo: 'iniciado',
          titulo: 'Servicio Iniciado',
          fecha: new Date(cotizacion.fecha_inicio || Date.now() - 21600000).toLocaleString(),
          descripcion: 'El operador ha iniciado el servicio.'
        });
      }
      // Si está completado
      if (cotizacion.estado === 'Completado') {
        eventos.push({
          tipo: 'completado',
          titulo: 'Servicio Completado',
          fecha: new Date(cotizacion.fecha_completado || Date.now() - 3600000).toLocaleString(),
          descripcion: `Servicio completado con éxito. Total: ${parseFloat(cotizacion.total_con_iva || '0').toFixed(2)}`
        });
      }
      // Si está cancelado
      if (cotizacion.estado === 'Cancelado') {
        eventos.push({
          tipo: 'cancelado',
          titulo: 'Servicio Cancelado',
          fecha: new Date(cotizacion.fecha_cancelacion || Date.now() - 7200000).toLocaleString(),
          descripcion: 'El servicio ha sido cancelado.'
        });
      }
      return eventos;
    };
    setHistorialEventos(generarHistorial());
    if (isOpen) {
      setAnimate(true);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, cotizacion, operadores]);
  useEffect(() => {
    // Si ya hay un operador asignado en la cotización, marcarlo como confirmado
    if (cotizacion.operador_id) {
      setOperadorConfirmado(true);
      setSelectedOperador(cotizacion.operador_id.toString());
    }
    
    // Establecer el paso actual según el estado de la cotización
    switch(cotizacion.estado) {
      case 'Pendiente':
        setCurrentStep('asignar');
        break;
      case 'Asignado':
        setCurrentStep('iniciar');
        break;
      case 'En Progreso':
      case 'Iniciado':
        setCurrentStep('editar');
        break;
      case 'Completado':
      case 'Cancelado':
        setCurrentStep('finalizado');
        break;
      default:
        setCurrentStep('asignar');
    }
  }, [cotizacion]);
  const handleClose = () => {
    setAnimate(false);
    setTimeout(() => onClose(), 300);
  };
  const handleOperadorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOperador(e.target.value);
  };
  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Remove leading zeros and validate numeric input
    const sanitizedValue = value.replace(/^0+(?=\d)/, '').replace(/[^\d.]/g, '');
    // Ensure only one decimal point
    const parts = sanitizedValue.split('.');
    const finalValue = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitizedValue;
    // Convert empty string to 0
    const numericValue = finalValue === '' ? 0 : parseFloat(finalValue) || 0;
    setCostDetails((prev) => ({ ...prev, [name]: numericValue }));
  };
  const confirmCostDetails = async () => {
    try {
      // Asegurarnos que los valores son números válidos
      const costoAdicional = parseFloat(costDetails.costoAdicional.toString()) || 0;
      const costoAsegurado = parseFloat(costDetails.costoAsegurado.toString()) || 0;
      const numeroCasetas = parseInt(costDetails.numeroCasetas.toString()) || 0;
      const costoCasetas = parseFloat(costDetails.costoCasetas.toString()) || 0;
      
      console.log('Enviando datos de costos:', {
        costo_adicional: costoAdicional,
        costo_asegurado: costoAsegurado,
        num_casetas: numeroCasetas,
        costo_casetas: costoCasetas
      });
      
      // Usar axios en lugar de fetch
      const response = await axios.put(`http://localhost:5000/api/cotizaciones/${cotizacion.id_cotizacion}/costos`, {
        costo_adicional: costoAdicional,
        costo_asegurado: costoAsegurado,
        num_casetas: numeroCasetas,
        costo_casetas: costoCasetas,
      });
      
      console.log('Respuesta del servidor:', response.data);
      setIsCostConfirmed(true);
      showNotification('Detalles de costo actualizados y confirmados');
      
      // Actualizar el historial
      setHistorialEventos(prev => [
        ...prev,
        {
          tipo: 'costos',
          titulo: 'Costos Actualizados',
          fecha: new Date().toLocaleString(),
          descripcion: `Se actualizaron los costos del servicio. Total: ${calculateTotal().total.toFixed(2)}`
        }
      ]);
    } catch (error) {
      console.error('Error al actualizar costos:', error);
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.mensaje || error.message 
        : 'Error desconocido';
      showNotification(`Error al actualizar los costos: ${errorMessage}`, 'error');
    }
  };
  const handleConfirmPoliza = async () => {
    if (poliza.trim() !== '' && poliza === confirmPoliza) {
      try {
        console.log('Enviando datos de póliza:', {
          n_poliza: poliza
        });
        
        // Usar axios en lugar de fetch
        const response = await axios.put(`http://localhost:5000/api/cotizaciones/${cotizacion.id_cotizacion}/poliza`, {
          n_poliza: poliza,
        });
        
        console.log('Respuesta del servidor:', response.data);
        setIsPolizaConfirmed(true);
        showNotification('Póliza confirmada y guardada correctamente');
        
        // Actualizar el historial
        setHistorialEventos(prev => [
          ...prev,
          {
            tipo: 'poliza',
            titulo: 'Póliza Registrada',
            fecha: new Date().toLocaleString(),
            descripcion: `Se registró la póliza número: ${poliza}`
          }
        ]);
      } catch (error) {
        console.error('Error al guardar póliza:', error);
        const errorMessage = axios.isAxiosError(error) 
          ? error.response?.data?.mensaje || error.message 
          : 'Error desconocido';
        showNotification(`Error al guardar la póliza: ${errorMessage}`, 'error');
      }
    } else {
      showNotification('Las pólizas no coinciden o están vacías', 'error');
    }
  };
  const calculateTotal = () => {
    // Obtener los costos originales de la cotización
    const costoOriginal = parseFloat(cotizacion.total || '0');
    
    // Sumar los costos adicionales
    const costosAdicionales = 
      parseFloat(costDetails.costoAdicional.toString() || '0') +
      parseFloat(costDetails.costoAsegurado.toString() || '0') +
      parseInt(costDetails.numeroCasetas.toString() || '0') * parseFloat(costDetails.costoCasetas.toString() || '0');
    
    const subtotal = costoOriginal + costosAdicionales;
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    
    return { subtotal, iva, total };
  };
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const notification = document.createElement('div');
    notification.className = `${styles.notification} ${styles[`notification${type.charAt(0).toUpperCase() + type.slice(1)}`]}`;
    notification.innerHTML = `
      <div class="${styles.notificationContent}">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add(styles.notificationShow);
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove(styles.notificationShow);
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };
  // Función para enviar mensaje al iniciar servicio
  const enviarMensajeInicioServicio = async () => {
    if (!cotizacion.operador_id) {
      showNotification('No hay operador asignado', 'error');
      return;
    }
    
    setEnviandoMensaje(true);
    
    try {
      const operador = operadores.find(op => op.id_operador.toString() === cotizacion.operador_id?.toString());
      
      if (!operador) {
        throw new Error('No se encontró información del operador');
      }
      
      // Verificar que el operador tenga teléfono
      if (!operador.telefono) {
        throw new Error('El operador no tiene un número de teléfono registrado');
      }
      
      // Verificar que el operador tenga API key
      if (!operador.apikey_telefono) {
        throw new Error('El operador no tiene una API key configurada');
      }
      
      // Crear el mensaje para el operador
      const mensaje = crearMensajeInicioServicio(cotizacion, operador);
      
      // Enviar el mensaje con la API key del operador
      const resultado = await enviarMensajeWhatsApp(
        operador.telefono,
        mensaje,
        operador.apikey_telefono
      );
      
      if (!resultado.success) {
        throw new Error(resultado.message);
      }
      
      showNotification('Mensaje enviado al operador correctamente');
      
      // Actualizar el historial
      setHistorialEventos(prev => [
        ...prev,
        {
          tipo: 'mensaje',
          titulo: 'Mensaje Enviado',
          fecha: new Date().toLocaleString(),
          descripcion: `Se ha enviado un mensaje al operador ${operador.nombre} ${operador.ap_paterno}.`
        }
      ]);
      
      // Avanzar al siguiente paso
      setCurrentStep('editar');
    } catch (error) {
      //console.error('Error al enviar mensaje:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      //showNotification(`Error al enviar mensaje: ${errorMessage}`, 'error');
    } finally {
      setEnviandoMensaje(false);
    }
  };
  // Función para reenviar mensaje al operador
  const handleReenviarMensaje = async () => {
    if (!cotizacion.operador_id) {
      showNotification('No hay operador asignado', 'error');
      return;
    }
    
    setEnviandoMensaje(true);
    
    try {
      const operador = operadores.find(op => op.id_operador.toString() === cotizacion.operador_id?.toString());
      
      if (!operador) {
        throw new Error('No se encontró información del operador');
      }
      
      // Verificar que el operador tenga teléfono
      if (!operador.telefono) {
        throw new Error('El operador no tiene un número de teléfono registrado');
      }
      
      // Verificar que el operador tenga API key
      if (!operador.apikey_telefono) {
        throw new Error('El operador no tiene una API key configurada');
      }
      
      // Crear el mensaje recordatorio
      const mensaje = crearMensajeRecordatorio(cotizacion, operador);
      
      // Enviar el mensaje con la API key del operador
      const resultado = await enviarMensajeWhatsApp(
        operador.telefono,
        mensaje,
        operador.apikey_telefono
      );
      
      if (!resultado.success) {
        throw new Error(resultado.message);
      }
      
      showNotification('Mensaje reenviado al operador correctamente');
      
      if (onRecordarOperador) {
        onRecordarOperador();
      }
      
      // Actualizar el historial
      setHistorialEventos(prev => [
        ...prev,
        {
          tipo: 'mensaje',
          titulo: 'Mensaje Reenviado',
          fecha: new Date().toLocaleString(),
          descripcion: `Se ha reenviado un mensaje al operador ${operador.nombre} ${operador.ap_paterno}.`
        }
      ]);
    } catch (error) {
      //console.error('Error al reenviar mensaje:', error);
      //const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      //showNotification(`Error al reenviar mensaje: ${errorMessage}`, 'error');
    } finally {
      setEnviandoMensaje(false);
    }
  };
  // Función para reasignar operador y enviar mensaje
  const handleReasignarOperador = async (nuevoOperadorId: string) => {
    if (!nuevoOperadorId) {
      showNotification('Seleccione un operador primero', 'error');
      return;
    }
    
    setEnviandoMensaje(true);
    
    try {
      const nuevoOperador = operadores.find(op => op.id_operador.toString() === nuevoOperadorId);
      
      if (!nuevoOperador) {
        throw new Error('No se encontró información del nuevo operador');
      }
      
      // Verificar que el operador tenga teléfono
      if (!nuevoOperador.telefono) {
        throw new Error('El nuevo operador no tiene un número de teléfono registrado');
      }
      
      // Verificar que el operador tenga API key
      if (!nuevoOperador.apikey_telefono) {
        throw new Error('El nuevo operador no tiene una API key configurada');
      }
      
      // Primero reasignamos en la base de datos
      await onReasignarOperador(nuevoOperadorId);
      
      // Crear el mensaje de reasignación
      const mensaje = crearMensajeReasignacion(cotizacion, nuevoOperador);
      
      // Enviar el mensaje con la API key del nuevo operador
      const resultado = await enviarMensajeWhatsApp(
        nuevoOperador.telefono,
        mensaje,
        nuevoOperador.apikey_telefono
      );
      
      if (!resultado.success) {
        throw new Error(resultado.message);
      }
      
      setOperadorConfirmado(true);
      setShowReasignarModal(false);
      showNotification('Operador reasignado y notificado correctamente');
      
      // Actualizar el historial
      setHistorialEventos(prev => [
        ...prev,
        {
          tipo: 'reasignado',
          titulo: 'Operador Reasignado',
          fecha: new Date().toLocaleString(),
          descripcion: `El servicio ha sido reasignado al operador ${nuevoOperador.nombre} ${nuevoOperador.ap_paterno}.`
        }
      ]);
      
      // Volver al paso de iniciar servicio
      setCurrentStep('iniciar');
    } catch (error) {
      //console.error('Error al reasignar operador:', error);
      //const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      //showNotification(`Error al reasignar operador: ${errorMessage}`, 'error');
    } finally {
      setEnviandoMensaje(false);
    }
  };
  // Función para enviar mensaje de servicio completado
  const enviarMensajeCompletado = async () => {
    if (!cotizacion.operador_id) {
      return; // Si no hay operador, no enviamos mensaje pero completamos el servicio
    }
    
    try {
      const operador = operadores.find(op => op.id_operador.toString() === cotizacion.operador_id?.toString());
      
      if (!operador || !operador.telefono || !operador.apikey_telefono) {
        return; // Si falta información del operador, no enviamos mensaje
      }
      
      const { total } = calculateTotal();
      const mensaje = crearMensajeServicioCompletado(cotizacion, operador, total);
      
      await enviarMensajeWhatsApp(
        operador.telefono,
        mensaje,
        operador.apikey_telefono
      );
    } catch (error) {
      console.error('Error al enviar mensaje de servicio completado:', error);
      // No interrumpimos el flujo si falla el envío del mensaje
    }
  };
  // Función para enviar mensaje de servicio cancelado
  const enviarMensajeCancelacion = async () => {
    if (!cotizacion.operador_id) {
      return; // Si no hay operador, no enviamos mensaje pero cancelamos el servicio
    }
    
    try {
      const operador = operadores.find(op => op.id_operador.toString() === cotizacion.operador_id?.toString());
      
      if (!operador || !operador.telefono || !operador.apikey_telefono) {
        return; // Si falta información del operador, no enviamos mensaje
      }
      
      const mensaje = crearMensajeCancelacion(cotizacion, operador);
      
      await enviarMensajeWhatsApp(
        operador.telefono,
        mensaje,
        operador.apikey_telefono
      );
    } catch (error) {
      console.error('Error al enviar mensaje de cancelación:', error);
      // No interrumpimos el flujo si falla el envío del mensaje
    }
  };
  // Función para manejar la asignación de operador
  const handleAsignarOperador = async () => {
    if (!selectedOperador) {
      showNotification('Seleccione un operador primero', 'error');
      return;
    }
    
    try {
      // Primero asignamos el operador en la base de datos
      await onAsignar(selectedOperador);
      const operador = operadores.find(op => op.id_operador.toString() === selectedOperador);
      setOperadorConfirmado(true);
      
      // Intentamos enviar mensaje si el operador tiene la información necesaria
      if (operador && operador.telefono && operador.apikey_telefono) {
        setEnviandoMensaje(true);
        try {
          const mensaje = crearMensajeServicioAsignado(cotizacion, operador);
          await enviarMensajeWhatsApp(
            operador.telefono,
            mensaje,
            operador.apikey_telefono
          );
          showNotification('Operador asignado y notificado correctamente');
        } catch (error) {
          console.error('Error al enviar notificación:', error);
          showNotification('Operador asignado, pero hubo un error al enviar la notificación', 'warning');
        } finally {
          setEnviandoMensaje(false);
        }
      } else {
        showNotification('Operador asignado correctamente');
      }
      
      // Actualizar el historial
      setHistorialEventos(prev => [
        ...prev,
        {
          tipo: 'asignado',
          titulo: 'Operador Asignado',
          fecha: new Date().toLocaleString(),
          descripcion: `Se asignó el servicio al operador ${operador?.nombre || ''} ${operador?.ap_paterno || ''}.`
        }
      ]);
      
      // Avanzar al siguiente paso
      setCurrentStep('iniciar');
    } catch (error) {
      console.error('Error al asignar operador:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showNotification(`Error al asignar operador: ${errorMessage}`, 'error');
    }
  };
  // Función para manejar el inicio del servicio
  const handleIniciarServicio = async () => {
    try {
      // Primero marcamos el servicio como iniciado en la base de datos
      await onIniciar();
      
      // Luego enviamos el mensaje al operador
      await enviarMensajeInicioServicio();
      
      showNotification('El servicio ha iniciado');
      
      // Actualizar el historial
      setHistorialEventos(prev => [
        ...prev,
        {
          tipo: 'iniciado',
          titulo: 'Servicio Iniciado',
          fecha: new Date().toLocaleString(),
          descripcion: 'El operador ha iniciado el servicio.'
        }
      ]);
      
      // Avanzar al paso de editar
      setCurrentStep('editar');
    } catch (error) {
      console.error('Error al iniciar servicio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showNotification(`Error al iniciar servicio: ${errorMessage}`, 'error');
    }
  };
  // Función para manejar la cancelación del servicio
  const handleCancelarServicio = async () => {
    try {
      // Primero enviamos el mensaje de cancelación si hay operador asignado
      await enviarMensajeCancelacion();
      
      // Luego cancelamos el servicio en la base de datos
      await onCancelar();
      
      showNotification('Servicio cancelado');
      
      // Actualizar el historial
      setHistorialEventos(prev => [
        ...prev,
        {
          tipo: 'cancelado',
          titulo: 'Servicio Cancelado',
          fecha: new Date().toLocaleString(),
          descripcion: 'El servicio ha sido cancelado.'
        }
      ]);
      
      // Avanzar al paso finalizado
      setCurrentStep('finalizado');
    } catch (error) {
      console.error('Error al cancelar servicio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showNotification(`Error al cancelar servicio: ${errorMessage}`, 'error');
    }
  };
  // Función para manejar la finalización del servicio
  const handleCompletarServicio = async () => {
    try {
      const { total } = calculateTotal();
      
      // Primero enviamos el mensaje de servicio completado
      await enviarMensajeCompletado();
      
      // Luego completamos el servicio en la base de datos
      await onCompletar(costDetails, total);
      
      showNotification('Servicio completado exitosamente');
      
      // Actualizar el historial
      setHistorialEventos(prev => [
        ...prev,
        {
          tipo: 'completado',
          titulo: 'Servicio Completado',
          fecha: new Date().toLocaleString(),
          descripcion: `Servicio completado con éxito. Total: ${total.toFixed(2)}`
        }
      ]);
      
      // Avanzar al paso finalizado
      setCurrentStep('finalizado');
    } catch (error) {
      console.error('Error al completar servicio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showNotification(`Error al completar servicio: ${errorMessage}`, 'error');
    }
  };
  const confirmActionHandler = (action: (() => void) | null, actionType: string) => {
    let actionFunction: (() => void);
    
    switch (actionType) {
      case 'iniciar':
        actionFunction = handleIniciarServicio;
        break;
      case 'cancelar':
        actionFunction = handleCancelarServicio;
        break;
      case 'completar':
        actionFunction = handleCompletarServicio;
        break;
      default:
        actionFunction = action || (() => {});
    }
    
    setConfirmAction(() => actionFunction);
    setShowConfirmation(true);
  };
  const executeConfirmedAction = () => {
    if (confirmAction) {
      confirmAction();
    }
    setShowConfirmation(false);
  };
  const { subtotal, iva, total } = calculateTotal();
  // Componente para renderizar las acciones según el paso actual
  const renderAccionesSegunPaso = () => {
    switch(currentStep) {
      case 'asignar':
        return (
          <div className={styles.actionButtons}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAsignarOperador}
              className={`${styles.btnAction} ${styles.btnAsignar}`}
              disabled={!selectedOperador || enviandoMensaje}
            >
              <i className="fas fa-check"></i> 
              {enviandoMensaje ? 'Asignando...' : 'Asignar Operador'}
            </motion.button>
          </div>
        );
      case 'iniciar':
        return (
          <div className={styles.actionButtons}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => confirmActionHandler(null, 'iniciar')}
              className={`${styles.btnAction} ${styles.btnIniciar}`}
              disabled={enviandoMensaje}
            >
              <i className="fas fa-play"></i> 
              {enviandoMensaje ? 'Iniciando...' : 'Iniciar Viaje'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => confirmActionHandler(null, 'cancelar')}
              className={`${styles.btnAction} ${styles.btnCancelar}`}
              disabled={enviandoMensaje}
            >
              <i className="fas fa-times"></i> Cancelar Viaje
            </motion.button>
          </div>
        );
      case 'editar':
        return (
          <div className={styles.actionButtons}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReenviarMensaje}
              className={`${styles.btnAction} ${styles.btnRecordar}`}
              disabled={enviandoMensaje}
            >
              <i className="fas fa-envelope"></i> 
              {enviandoMensaje ? 'Enviando...' : 'Enviar mensaje a operador'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowReasignarModal(true)}
              className={`${styles.btnAction} ${styles.btnReasignar}`}
            >
              <i className="fas fa-exchange-alt"></i> Reasignar Operador
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => confirmActionHandler(null, 'cancelar')}
              className={`${styles.btnAction} ${styles.btnCancelar}`}
            >
              <i className="fas fa-times"></i> Cancelar Servicio
            </motion.button>
            {isPolizaConfirmed && isCostConfirmed && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => confirmActionHandler(null, 'completar')}
                className={`${styles.btnAction} ${styles.btnCompletar}`}
              >
                <i className="fas fa-check"></i> Marcar como Completado
              </motion.button>
            )}
          </div>
        );
      case 'finalizado':
        return (
          <div className={styles.actionButtons}>
            {cotizacion.estado === 'Completado' ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={styles.estadoCompletado}
              >
                <i className="fas fa-check-circle"></i> Este servicio ha sido completado
              </motion.div>
            ) : cotizacion.estado === 'Cancelado' ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={styles.estadoCancelado}
              >
                <i className="fas fa-ban"></i> Este servicio ha sido cancelado
              </motion.div>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`${styles.modalOverlay} ${animate ? 'fade-in' : 'fade-out'}`}
        >
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`${styles.modalContent} ${animate ? 'slide-in' : 'slide-out'}`}
          >
            <button onClick={handleClose} className={styles.closeBtn}>
              <i className="fas fa-times"></i>
            </button>
            
            <div className={styles.modalHeader}>
              <h2>
                <i className="fas fa-clipboard-list"></i> 
                Servicio #{cotizacion.n_folio}
              </h2>
              <div className={styles.estadoBadge}>
                <span className={styles[`estado${cotizacion.estado?.charAt(0).toUpperCase() + cotizacion.estado?.slice(1).toLowerCase()}`]}>
                  {cotizacion.estado}
                </span>
              </div>
            </div>
            
            <div className={styles.tabsContainer}>
              <div 
                className={`${styles.tab} ${activeTab === 'detalles' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('detalles')}
              >
                <i className="fas fa-info-circle"></i> Detalles
              </div>
              <div 
                className={`${styles.tab} ${activeTab === 'acciones' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('acciones')}
              >
                <i className="fas fa-cogs"></i> Acciones
              </div>
              <div 
                className={`${styles.tab} ${activeTab === 'historial' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('historial')}
              >
                <i className="fas fa-history"></i> Historial
              </div>
            </div>
            
            <div className={styles.modalBody}>
              <AnimatePresence mode="wait">
                {activeTab === 'detalles' && (
                  <motion.div
                    key="detalles"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ServiceDetails cotizacion={cotizacion} />
                  </motion.div>
                )}
                
                {activeTab === 'acciones' && (
                  <motion.div
                    key="acciones"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Sección de selección de operador */}
                    {currentStep === 'asignar' && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${styles.operatorSection} ${styles.infoSection}`}
                      >
                        <h3>
                          <i className="fas fa-user"></i> {cotizacion.operador_id ? 'Reasignar Operador' : 'Seleccionar Operador'}
                        </h3>
                        <div className={styles.selectContainer}>
                          <select
                            value={selectedOperador}
                            onChange={handleOperadorSelect}
                            className={styles.selectOperador}
                            disabled={enviandoMensaje}
                          >
                            <option value="">Seleccionar operador</option>
                            {operadores.map((op) => (
                              <option key={op.id_operador} value={op.id_operador}>
                                {op.nombre} {op.ap_paterno} - {op.telefono || 'Sin Tlf'}
                              </option>
                            ))}
                          </select>
                          <i className={`fas fa-chevron-down ${styles.selectArrow}`}></i>
                        </div>
                        
                        {selectedOperador && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={styles.operatorPreview}
                          >
                            <h4>Operador Seleccionado:</h4>
                            <p>
                              {operadores.find(op => op.id_operador.toString() === selectedOperador)?.nombre} {operadores.find(op => op.id_operador.toString() === selectedOperador)?.ap_paterno}
                            </p>
                            <p>
                              <i className="fas fa-phone"></i> {operadores.find(op => op.id_operador.toString() === selectedOperador)?.telefono || 'Sin teléfono'}
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                    
                    {/* Sección de edición de costos si estamos en ese paso */}
                    {currentStep === 'editar' && (
                      <>
                        <CostDetails
                          costDetails={costDetails}
                          handleCostChange={handleCostChange}
                          isCostConfirmed={isCostConfirmed}
                          confirmCostDetails={confirmCostDetails}
                        />
                        
                        <ConfirmPoliza
                          poliza={poliza}
                          confirmPoliza={confirmPoliza}
                          setPoliza={setPoliza}
                          setConfirmPoliza={setConfirmPoliza}
                          isPolizaConfirmed={isPolizaConfirmed}
                          handleConfirmPoliza={handleConfirmPoliza}
                        />
                        
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={styles.totales}
                        >
                          <h3>Resumen de Costos</h3>
                          <div className={styles.totalesGrid}>
                            <div className={styles.totalItem}>
                              <span>Costo Original:</span>
                              <span>${parseFloat(cotizacion.total || '0').toFixed(2)}</span>
                            </div>
                            <div className={styles.totalItem}>
                              <span>Costos Adicionales:</span>
                              <span>${(parseFloat(costDetails.costoAdicional.toString() || '0') + parseFloat(costDetails.costoAsegurado.toString() || '0') + parseInt(costDetails.numeroCasetas.toString() || '0') * parseFloat(costDetails.costoCasetas.toString() || '0')).toFixed(2)}</span>
                            </div>
                            <div className={styles.totalItem}>
                              <span>Subtotal:</span>
                              <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className={styles.totalItem}>
                              <span>IVA (16%):</span>
                              <span>${iva.toFixed(2)}</span>
                            </div>
                            <div className={`${styles.totalItem} ${styles.totalFinal}`}>
                              <span>Total:</span>
                              <span>${total.toFixed(2)}</span>
                            </div>
                          </div>
                        </motion.div>
                      </>
                    )}
                    
                    {/* Sección de botones de acción */}
                    <div className={styles.actionContainer}>
                      <h3>Acciones Disponibles</h3>
                      {renderAccionesSegunPaso()}
                    </div>
                  </motion.div>
                )}
                
                {activeTab === 'historial' && (
                  <motion.div
                    key="historial"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className={styles.historyContainer}
                  >
                    {historialEventos.map((evento, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`${styles.historyItem} ${styles[`historyItem${evento.tipo.charAt(0).toUpperCase() + evento.tipo.slice(1)}`]}`}
                      >
                        <div className={styles.historyIcon}>
                          <i className={`fas ${
                            evento.tipo === 'creado' ? 'fa-plus' :
                            evento.tipo === 'asignado' ? 'fa-user' :
                            evento.tipo === 'iniciado' ? 'fa-play' :
                            evento.tipo === 'completado' ? 'fa-check' :
                            evento.tipo === 'cancelado' ? 'fa-ban' :
                            evento.tipo === 'mensaje' ? 'fa-envelope' :
                            evento.tipo === 'reasignado' ? 'fa-exchange-alt' :
                            evento.tipo === 'costos' ? 'fa-dollar-sign' :
                            evento.tipo === 'poliza' ? 'fa-file-alt' : 'fa-info-circle'
                          }`}></i>
                        </div>
                        <div className={styles.historyContent}>
                          <div className={styles.historyTitle}>{evento.titulo}</div>
                          <div className={styles.historyDate}>{evento.fecha}</div>
                          <div className={styles.historyDescription}>{evento.descripcion}</div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          
          {/* Diálogo de confirmación */}
          <AnimatePresence>
            {showConfirmation && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={styles.confirmationOverlay}
              >
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={styles.confirmationDialog}
                >
                  <h3>¿Está seguro?</h3>
                  <p>Esta acción no se puede deshacer.</p>
                  <div className={styles.confirmationButtons}>
                    <button onClick={() => setShowConfirmation(false)} className={styles.btnCancel}>
                      <i className="fas fa-times"></i> Cancelar
                    </button>
                    <button onClick={executeConfirmedAction} className={styles.btnConfirm}>
                      <i className="fas fa-check"></i> Confirmar
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Modal para reasignar operador */}
          <AnimatePresence>
            {showReasignarModal && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={styles.reasignarOverlay}
              >
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={styles.reasignarDialog}
                >
                  <h3>Reasignar Operador</h3>
                  <p>Seleccione un nuevo operador para este servicio:</p>
                  <div className={styles.selectContainer}>
                    <select
                      value={selectedOperador}
                      onChange={handleOperadorSelect}
                      className={styles.selectOperador}
                    >
                      <option value="">Seleccionar operador</option>
                      {operadores.map((op) => (
                        <option key={op.id_operador} value={op.id_operador}>
                          {op.nombre} {op.ap_paterno} - {op.telefono || 'Sin Tlf'}
                        </option>
                      ))}
                    </select>
                    <i className={`fas fa-chevron-down ${styles.selectArrow}`}></i>
                  </div>
                  
                  {selectedOperador && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={styles.operatorPreview}
                    >
                      <h4>Nuevo Operador:</h4>
                      <p>
                        {operadores.find(op => op.id_operador.toString() === selectedOperador)?.nombre} {operadores.find(op => op.id_operador.toString() === selectedOperador)?.ap_paterno}
                      </p>
                      <p>
                        <i className="fas fa-phone"></i> {operadores.find(op => op.id_operador.toString() === selectedOperador)?.telefono || 'Sin teléfono'}
                      </p>
                    </motion.div>
                  )}
                  
                  <div className={styles.reasignarButtons}>
                    <button onClick={() => setShowReasignarModal(false)} className={styles.btnCancel}>
                      <i className="fas fa-times"></i> Cancelar
                    </button>
                    <button 
                      onClick={() => {
                        if (selectedOperador && selectedOperador !== cotizacion.operador_id?.toString()) {
                          handleReasignarOperador(selectedOperador);
                        } else {
                          showNotification('Seleccione un operador diferente', 'error');
                        }
                      }} 
                      className={styles.btnConfirm}
                      disabled={!selectedOperador || selectedOperador === cotizacion.operador_id?.toString() || enviandoMensaje}
                    >
                      <i className="fas fa-check"></i> 
                      {enviandoMensaje ? 'Reasignando...' : 'Confirmar Reasignación'}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
// Mostrar los datos del servicio (cliente, solicitante, vehículo, dirección)
interface ServiceDetailsProps {
  cotizacion: Cotizacion;
}
const ServiceDetails: React.FC<ServiceDetailsProps> = ({ cotizacion }) => (
  <div className={styles.serviceDetails}>
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={styles.infoSection}
    >
      <h3>
        <i className="fas fa-info-circle"></i> Servicio
      </h3>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <label className={styles.label}>ID Cliente:</label> 
          <span>{cotizacion.id_cliente}</span>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.label}>Cliente:</label> 
          <span>{cotizacion.nombre_cliente}</span>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.label}>Tipo:</label> 
          <span>{cotizacion.tipo_servicio}</span>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.label}>Total:</label> 
          <span className={styles.precio}>${parseFloat(cotizacion.total_con_iva || '0').toFixed(2)}</span>
        </div>
      </div>
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={styles.infoSection}
    >
      <h3>
        <i className="fas fa-user"></i> Solicitante
      </h3>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <label className={styles.label}>Nombre:</label> 
          <span>{cotizacion.as_nombre}</span>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.label}>RFC:</label> 
          <span>{cotizacion.as_rfc}</span>
        </div>
      </div>
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={styles.infoSection}
    >
      <h3>
        <i className="fas fa-car"></i> Vehículo
      </h3>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <label className={styles.label}>Marca/Modelo:</label> 
          <span>{cotizacion.marca} {cotizacion.modelo}</span>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.label}>Color:</label> 
          <span>{cotizacion.color}</span>
        </div>
        <div className={styles.infoItem}>
          <label className={styles.label}>Placas:</label> 
          <span className={styles.placas}>{cotizacion.placas}</span>
        </div>
      </div>
    </motion.div>
    
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={styles.infoSection}
    >
      <h3>
        <i className="fas fa-map-marker-alt"></i> Dirección
      </h3>
      <div className={styles.infoGrid}>
        <div className={`${styles.infoItem} ${styles.fullWidth}`}>
          <label className={styles.label}>Origen:</label> 
          <span>{cotizacion.direccion_origen}</span>
        </div>
        <div className={`${styles.infoItem} ${styles.fullWidth}`}>
          <label className={styles.label}>Destino:</label> 
          <span>{cotizacion.direccion_destino}</span>
        </div>
      </div>
    </motion.div>
    
    {cotizacion.n_poliza && (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={styles.infoSection}
      >
        <h3>
          <i className="fas fa-file-alt"></i> Póliza
        </h3>
        <div className={styles.infoGrid}>
          <div className={`${styles.infoItem} ${styles.fullWidth}`}>
            <label className={styles.label}>Número de Póliza:</label> 
            <span className={styles.polizaNumero}>{cotizacion.n_poliza}</span>
          </div>
        </div>
      </motion.div>
    )}
  </div>
);
// Componente de detalles de costo (estado "En Progreso")
interface CostDetailsProps {
  costDetails: CostDetails;
  handleCostChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCostConfirmed: boolean;
  confirmCostDetails: () => Promise<void>;
}
const CostDetails: React.FC<CostDetailsProps> = ({ 
  costDetails, 
  handleCostChange, 
  isCostConfirmed, 
  confirmCostDetails 
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={styles.costDetails}
  >
    <h3>
      <i className="fas fa-dollar-sign"></i> Editar Costos
    </h3>
    <div className={styles.costosGrid}>
      <div className={styles.costoItem}>
        <label>Costo Adicional:</label>
        <div className={styles.inputWithIcon}>
          <input
            type="text"
            name="costoAdicional"
            value={costDetails.costoAdicional === 0 ? '' : costDetails.costoAdicional}
            onChange={handleCostChange}
            disabled={isCostConfirmed}
            pattern="[0-9]*\.?[0-9]*"
            placeholder="0.00"
            className={styles.input}
          />
        </div>
      </div>
      <div className={styles.costoItem}>
        <label>Costo Asegurado:</label>
        <div className={styles.inputWithIcon}>
          <i className="fas fa-dollar-sign"></i>
          <input
            type="text"
            name="costoAsegurado"
            value={costDetails.costoAsegurado === 0 ? '' : costDetails.costoAsegurado}
            onChange={handleCostChange}
            disabled={isCostConfirmed}
            pattern="[0-9]*\.?[0-9]*"
            placeholder="0.00"
            className={styles.input}
          />
        </div>
      </div>
      <div className={styles.costoItem}>
        <label>Número de Casetas:</label>
        <div className={styles.inputWithIcon}>
          <i className="fas fa-road"></i>
          <input
            type="number"
            name="numeroCasetas"
            value={costDetails.numeroCasetas}
            onChange={handleCostChange}
            disabled={isCostConfirmed}
            className={styles.input}
          />
        </div>
      </div>
      <div className={styles.costoItem}>
        <label>Costo de Casetas:</label>
        <div className={styles.inputWithIcon}>
          <i className="fas fa-dollar-sign"></i>
          <input
            type="number"
            name="costoCasetas"
            value={costDetails.costoCasetas === 0 ? '' : costDetails.costoCasetas}
            onChange={handleCostChange}
            disabled={isCostConfirmed} 
            pattern="[0-9]*\.?[0-9]*"
            placeholder="0.00"
            className={styles.input}
          />
        </div>
      </div>
    </div>
    
    {!isCostConfirmed && (
      <div className={styles.costActions}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={confirmCostDetails}
          className={`${styles.btnAction} ${styles.btnConfirmarDetalles}`}
        >
          <i className="fas fa-check-circle"></i> Confirmar Costos
        </motion.button>
      </div>
    )}
    
    {isCostConfirmed && (
      <div className={styles.costConfirmed}>
        <i className="fas fa-check-circle"></i> Costos confirmados
      </div>
    )}
  </motion.div>
);
// Componente para la confirmación de la póliza
interface ConfirmPolizaProps {
  poliza: string;
  confirmPoliza: string;
  setPoliza: (poliza: string) => void;
  setConfirmPoliza: (poliza: string) => void;
  isPolizaConfirmed: boolean;
  handleConfirmPoliza: () => Promise<void>;
}
const ConfirmPoliza: React.FC<ConfirmPolizaProps> = ({
  poliza,
  confirmPoliza,
  setPoliza,
  setConfirmPoliza,
  isPolizaConfirmed,
  handleConfirmPoliza
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
    className={styles.confirmPoliza}
  >
    <h3>
      <i className="fas fa-file-alt"></i> Póliza
    </h3>
    <div className={styles.polizaInputs}>
      <div className={styles.inputGroup}>
        <label>Número de Póliza:</label>
        <div className={styles.inputWithIcon}>
          <i className="fas fa-file-contract"></i>
          <input
            type="text"
            placeholder="Ingrese número de póliza"
            value={poliza}
            onChange={(e) => setPoliza(e.target.value)}
            disabled={isPolizaConfirmed}
            className={styles.input}
          />
        </div>
      </div>
      <div className={styles.inputGroup}>
        <label>Confirmar Póliza:</label>
        <div className={styles.inputWithIcon}>
          <i className="fas fa-check-double"></i>
          <input
            type="text"
            placeholder="Confirme número de póliza"
            value={confirmPoliza}
            onChange={(e) => setConfirmPoliza(e.target.value)}
            disabled={isPolizaConfirmed}
            className={`${styles.input} ${confirmPoliza && poliza !== confirmPoliza ? styles.error : ''}`}
          />
        </div>
      </div>
    </div>
    
    {!isPolizaConfirmed && (
      <div className={styles.polizaActions}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleConfirmPoliza}
          className={`${styles.btnAction} ${styles.btnConfirmarPoliza}`}
          disabled={!poliza || !confirmPoliza || poliza !== confirmPoliza}
        >
          <i className="fas fa-check-double"></i> Confirmar Póliza
        </motion.button>
      </div>
    )}
    
    {isPolizaConfirmed && (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.polizaConfirmada}
      >
        <i className="fas fa-check"></i> Póliza confirmada: {poliza}
      </motion.div>
    )}
    
    {confirmPoliza && poliza !== confirmPoliza && (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={styles.polizaError}
      >
        <i className="fas fa-exclamation-triangle"></i> Las pólizas no coinciden
      </motion.div>
    )}
  </motion.div>
);
export default Modal;