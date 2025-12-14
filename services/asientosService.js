// services/asientosService.js
const db = require('../db/db');

/**
 * Obtiene la lista de asientos ya vendidos (ocupados) para una función.
 * @param {number} id_funcion - ID de la función a consultar.
 * @returns {Promise<Array>} Lista de objetos { fila, numero } de asientos ocupados.
 */
const getAsientosOcupadosPorFuncion = async (id_funcion) => {
    // La consulta une BOLETO con ASIENTO para obtener las coordenadas (fila, número)
    const query = `
        SELECT
            T2.fila,
            T2.numero
        FROM
            boleto T1
        JOIN
            asiento T2 ON T1.id_asiento = T2.id_asiento
        WHERE
            T1.id_funcion = $1
            AND T1.estado = 'Vendido'; -- Solo queremos los que están vendidos, no cancelados
    `;
    try {
        const { rows } = await db.query(query, [id_funcion]);
        return rows;
    } catch (error) {
        console.error("Error al obtener asientos ocupados:", error);
        throw new Error("Error interno al consultar asientos.");
    }
};

module.exports = {
    getAsientosOcupadosPorFuncion,
};