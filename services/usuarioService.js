// services/usuarioService.js
const db = require('../db/db');
const bcrypt = require('bcrypt'); // Asegúrate de haber instalado bcrypt

const saltRounds = 10; // Nivel de seguridad para el hasheo

/**
 * Registra un nuevo usuario hasheando la contraseña.
 */
const registrarUsuario = async (nombre, email, password, id_rol) => {
    // 1. Hashear la contraseña
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 2. Consulta de inserción
    const query = `
        INSERT INTO usuario (nombre, email, password, id_rol)
        VALUES ($1, $2, $3, $4)
        RETURNING id_usuario;
    `;
    
    // 3. Ejecutar la query
    try {
        const { rows } = await db.query(query, [nombre, email, passwordHash, id_rol]);
        return rows[0].id_usuario;
    } catch (error) {
        // Re-lanzar el error para que el router lo capture (ej. email duplicado)
        throw error;
    }
};

module.exports = {
    registrarUsuario,
};