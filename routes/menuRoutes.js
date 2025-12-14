// routes/menuRoutes.js
const express = require('express');
const router = express.Router();
const menuService = require('../services/menuService');

// GET /api/menu
// Retorna la lista de productos disponibles.
router.get('/', async (req, res) => {
    try {
        const menu = await menuService.getMenuCompleto();
        res.status(200).json(menu);
    } catch (error) {
        res.status(500).json({ error: error.message || "No se pudo obtener el menú." });
    }
});

module.exports = router;