// services/funcionesService.js
const db = require('../db/db');

/**
 * Obtiene todas las funciones disponibles con detalles de película y sala.
 * @returns {Promise<Array>} Lista de funciones.
 */
const getFuncionesDisponibles = async () => {
    // Consulta SQL que une las tablas para obtener toda la información necesaria para la App
    const query = `
        SELECT 
            f.id_funcion,
            f.fecha_hora,
            p.titulo AS pelicula_titulo,
            p.duracion AS pelicula_duracion,
            s.nombre AS sala_nombre,
            s.tipo AS sala_tipo
        FROM 
            funcion f
        JOIN 
            pelicula p ON f.id_pelicula = p.id_pelicula
        JOIN 
            sala s ON f.id_sala = s.id_sala
        WHERE 
            f.fecha_hora >= NOW() -- Solo funciones futuras
        ORDER BY 
            f.fecha_hora ASC;
    `;
    try {
        const { rows } = await db.query(query);
        return rows;
    } catch (error) {
        console.error("Error al obtener funciones disponibles:", error);
        throw new Error("Error interno del servidor al consultar funciones.");
    }
};

module.exports = {
    getFuncionesDisponibles,
};