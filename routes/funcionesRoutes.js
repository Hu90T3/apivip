// routes/funcionesRoutes.js
const express = require('express');
const router = express.Router();
const funcionesService = require('../services/funcionesService');

// GET /api/funciones
// Retorna la lista de todas las funciones disponibles para la cartelera.
router.get('/', async (req, res) => {
    try {
        const funciones = await funcionesService.getFuncionesDisponibles();
        // 200 OK: Respuesta exitosa
        res.status(200).json(funciones);
    } catch (error) {
        // 500 Internal Server Error: Algo salió mal en el servicio o la BD
        res.status(500).json({ error: error.message || "No se pudieron obtener las funciones." });
    }
});

module.exports = router;