// services/menuService.js
const db = require('../db/db');

/**
 * Obtiene todos los productos del menú clasificados por tipo.
 * @returns {Promise<Array>} Lista de productos.
 */
const getMenuCompleto = async () => {
    const query = `
        SELECT
            id_producto,
            nombre,
            precio,
            tipo
        FROM
            producto
        ORDER BY
            tipo, nombre;
    `;
    try {
        const { rows } = await db.query(query);
        return rows;
    } catch (error) {
        console.error("Error al obtener el menú:", error);
        throw new Error("Error interno al consultar el menú.");
    }
};

module.exports = {
    getMenuCompleto,
};