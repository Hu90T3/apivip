// routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();
const usuarioService = require('../services/usuarioService');

// POST /api/usuarios/registrar
// Registra un nuevo empleado (Cajero, Mesero, etc.). Requiere el hash de la contraseña.
router.post('/registrar', async (req, res) => {
    const { nombre, email, password, id_rol } = req.body;

    if (!nombre || !email || !password || !id_rol) {
        return res.status(400).json({ success: false, message: "Faltan campos requeridos." });
    }

    // Gerente solo puede crear roles del 2 al 6 (Cajero a Host)
    if (id_rol < 2 || id_rol > 6) {
        return res.status(403).json({ success: false, message: "No tiene permiso para crear ese tipo de rol." });
    }

    try {
        const id_usuario = await usuarioService.registrarUsuario(nombre, email, password, id_rol);
        res.status(201).json({ 
            success: true, 
            message: "Empleado registrado con éxito.", 
            id_usuario: id_usuario 
        });
    } catch (error) {
        if (error.code === '23505') { // Código de error de PostgreSQL para UNIQUE violation (email duplicado)
            return res.status(409).json({ success: false, message: "El correo electrónico ya está registrado." });
        }
        console.error("Error al registrar usuario:", error);
        res.status(500).json({ success: false, message: "Error interno al registrar el usuario." });
    }
});

module.exports = router;