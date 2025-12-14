// routes/authRouter.js
const express = require('express');
const router = express.Router();
const db = require('../db/db'); // Asume que tienes tu pool de db aquí

/**
 * Endpoint POST /auth/login
 * Realiza la validación de credenciales contra la tabla 'usuario'.
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Se requiere email y contraseña." });
    }

    try {
        const query = `
            SELECT 
                id_usuario, 
                nombre, 
                id_rol
            FROM 
                usuario
            WHERE 
                email = $1 AND password = $2;
        `;
        
        // Ejecutar la consulta en PostgreSQL
        const result = await db.pool.query(query, [email, password]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            
            // Envía la respuesta esperada por LoginResponse.kt en Android
            res.json({
                success: true,
                id_usuario: user.id_usuario,
                nombre: user.nombre,
                id_rol: user.id_rol,
                token: "FAKE_TOKEN" // Puedes usar un token real después si implementas JWT
            });
        } else {
            // Usuario no encontrado o credenciales incorrectas
            res.status(401).json({ success: false, message: "Credenciales inválidas." });
        }

    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
});

module.exports = router;