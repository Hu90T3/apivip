// services/ordenesService.js
const db = require('../db/db');

// Esta es la estructura de datos que esperamos del cuerpo (body) del POST
/* Ejemplo de datos recibidos:
{
    "id_funcion": 1,
    "id_usuario_cajero": 2, // Usuario que registra la venta (e.g., María López)
    "boletos": [
        {"fila": "F1", "asiento": 5, "precio": 120.00},
        {"fila": "F1", "asiento": 6, "precio": 120.00}
    ],
    "comida": [
        {"id_alimento": 1, "cantidad": 2, "id_usuario_mesero": 3, "precio_unitario": 85.00},
        {"id_alimento": 2, "cantidad": 1, "id_usuario_mesero": 3, "precio_unitario": 70.00}
    ]
}
*/

const crearOrdenCompleta = async (datosOrden) => {
    const client = await db.pool.connect(); // Obtener un cliente para la transacción
    
    // Desestructuración de datos
    const { id_funcion, id_usuario_cajero, boletos, comida } = datosOrden;

    try {
        await client.query('BEGIN'); // 1. Iniciar la transacción

        // --- 1. Calcular el Total ---
        const total_boletos = boletos.reduce((sum, b) => sum + b.precio, 0);
        const total_comida = comida.reduce((sum, c) => sum + (c.precio_unitario * c.cantidad), 0);
        const total_general = total_boletos + total_comida;

        // --- 2. Insertar la Orden Principal (Venta) ---
        const ordenVentaQuery = `
            INSERT INTO orden (id_usuario, tipo_orden, total, fecha_hora)
            VALUES ($1, $2, $3, NOW())
            RETURNING id_orden;
        `;
        const resOrden = await client.query(ordenVentaQuery, [id_usuario_cajero, 'Venta', total_general]);
        const id_orden = resOrden.rows[0].id_orden;

        // --- 3. Registrar Boletos (Detalle de Orden de Venta) y Asientos ---
        for (const boleto of boletos) {
            // Inserta el detalle del boleto
            const detalleBoletoQuery = `
                INSERT INTO orden_detalle (id_orden, descripcion, cantidad, precio_unitario)
                VALUES ($1, $2, $3, $4);
            `;
            await client.query(detalleBoletoQuery, [id_orden, `Boleto ${boleto.fila}-${boleto.asiento}`, 1, boleto.precio]);

            // Actualiza la disponibilidad del asiento (Se asume que tienes una tabla asientos)
            // Aquí deberías tener una lógica de ASIGNACIÓN de asiento/status
            // Por simplicidad de la tabla 'asiento' inicial, solo registramos.
        }

        // --- 4. Registrar Comida (Detalle de Orden de Venta) ---
        for (const item of comida) {
            const detalleComidaQuery = `
                INSERT INTO orden_detalle (id_orden, descripcion, cantidad, precio_unitario, id_alimento, id_usuario_mesero)
                VALUES ($1, $2, $3, $4, $5, $6);
            `;
            // NOTA: Aquí necesitarías hacer un JOIN con la tabla 'alimento' para obtener la descripción real.
            // Para el ejemplo, usaremos una descripción genérica.
            const descripcion = `Alimento ID ${item.id_alimento}`; 
            await client.query(detalleComidaQuery, [id_orden, descripcion, item.cantidad, item.precio_unitario, item.id_alimento, item.id_usuario_mesero]);
        }

        await client.query('COMMIT'); // 5. Confirmar la transacción
        return { success: true, id_orden, total: total_general };

    } catch (e) {
        await client.query('ROLLBACK'); // 6. Revertir si algo falla
        console.error("Error en la transacción de orden:", e);
        throw e; // Relanzar el error para que el router lo capture
    } finally {
        client.release(); // 7. Liberar el cliente de la pool
    }
};
/**
 * Obtiene las órdenes de comida pendientes de preparación o entrega.
 * @param {string} estado - Estado a filtrar (e.g., 'Tomada', 'En preparación', 'Lista').
 * @returns {Promise<Array>} Lista de detalles de órdenes.
 */
const getOrdenesPendientes = async (estado) => {
    // Esta consulta trae los detalles de la orden (la comida) y de dónde viene (sala)
    const query = `
        SELECT
            OD.id_detalle,
            O.id_orden,
            U_M.nombre AS mesero_nombre,
            P.nombre AS producto_nombre,
            OD.cantidad,
            OD.estado_preparacion,
            S.nombre AS sala_nombre
        FROM
            orden_detalle OD
        JOIN
            orden O ON OD.id_orden = O.id_orden
        JOIN
            usuario U_M ON O.id_mesero = U_M.id_usuario
        JOIN
            producto P ON OD.id_producto = P.id_producto
        JOIN
            boleto B ON O.id_boleto = B.id_boleto
        JOIN
            funcion F ON B.id_funcion = F.id_funcion
        JOIN
            sala S ON F.id_sala = S.id_sala
        WHERE
            OD.estado_preparacion = $1
        ORDER BY
            O.fecha_hora ASC;
    `;
    try {
        const { rows } = await db.query(query, [estado]);
        return rows;
    } catch (error) {
        console.error("Error al obtener órdenes pendientes:", error);
        throw new Error("Error interno al consultar órdenes.");
    }
};

module.exports = {
    crearOrdenCompleta,
    getOrdenesPendientes, // <-- AGREGAR ESTO
};