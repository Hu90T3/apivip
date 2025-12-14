// routes/asientosRoutes.js
const express = require('express');
const router = express.Router();
const asientosService = require('../services/asientosService');

// GET /api/asientos/:idFuncion
// Retorna la lista de asientos ocupados para una función.
router.get('/:idFuncion', async (req, res) => {
    const idFuncion = parseInt(req.params.idFuncion);
    
    if (isNaN(idFuncion)) {
        return res.status(400).json({ error: "El ID de la función debe ser un número válido." });
    }

    try {
        const asientos = await asientosService.getAsientosOcupadosPorFuncion(idFuncion);
        res.status(200).json(asientos);
    } catch (error) {
        res.status(500).json({ error: error.message || "No se pudieron obtener los asientos." });
    }
});

module.exports = router;