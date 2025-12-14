// routes/ordenesRoutes.js
const express = require('express');
const router = express.Router();
const ordenesService = require('../services/ordenesService');

// POST /api/ordenes
// Recibe un cuerpo JSON con la venta de boletos y comida.
router.post('/', async (req, res) => {
    const datosOrden = req.body;
    
    // Validación básica de datos (puedes expandir esto)
    if (!datosOrden.id_funcion || !datosOrden.id_usuario_cajero || !datosOrden.boletos) {
        return res.status(400).json({ error: "Faltan datos requeridos: id_funcion, id_usuario_cajero y boletos." });
    }

    try {
        const resultado = await ordenesService.crearOrdenCompleta(datosOrden);
        // 201 Created: Respuesta exitosa de creación
        res.status(201).json({ 
            mensaje: "Orden y detalles registrados con éxito.",
            id_orden: resultado.id_orden,
            total: resultado.total
        });
    } catch (error) {
        // Si el servicio lanza un error (ej. error de DB), respondemos con 500
        res.status(500).json({ error: "Error al procesar la transacción de la orden." });
    }
});
// GET /api/ordenes/pendientes/:estado
// Permite al staff (Cocina/Mesero) ver órdenes filtradas por estado (e.g., 'Tomada', 'En preparación', 'Lista').
router.get('/pendientes/:estado', async (req, res) => {
    const estado = req.params.estado;
    
    // Lista de estados válidos (basado en estado_prep_enum)
    const estadosValidos = ['Tomada', 'En preparación', 'Lista']; 

    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: "Estado de preparación inválido. Use 'Tomada', 'En preparación' o 'Lista'." });
    }

    try {
        const ordenes = await ordenesService.getOrdenesPendientes(estado);
        res.status(200).json(ordenes);
    } catch (error) {
        res.status(500).json({ error: error.message || "Error al obtener la lista de órdenes pendientes." });
    }
});

module.exports = router;