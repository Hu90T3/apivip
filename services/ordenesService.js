// services/ordenesService.js
const db = require('../db/db');

const crearOrdenCompleta = async (datosOrden) => {
    const client = await db.pool.connect(); 
    
    // Desestructuración de datos (Correcto, viene de Android)
    const { id_funcion, id_usuario_cajero, boletos, comida } = datosOrden;
    let total_venta_registrado = 0; // Para el retorno final

    // Array para guardar los IDs de las nuevas "mini-órdenes" (La tabla 'orden')
    const ids_orden_registrados = [];

    try {
        await client.query('BEGIN'); // 1. Iniciar la transacción

        // ----------------------------------------------------------------------
        // 2. REGISTRAR BOLETOS: Crear una fila en la tabla 'orden' por cada boleto
        // ----------------------------------------------------------------------
        
        // Consulta: id_boleto (se asume que existe el id), id_cajero_cobro, total_orden, estado
        const ordenBoletoQuery = `
            INSERT INTO orden (id_boleto, id_mesero, id_cajero_cobro, fecha_hora, total_orden, estado)
            VALUES ($1, NULL, $2, NOW(), $3, $4) 
            RETURNING id_orden;
        `;
        
        // NOTA: Para que esto funcione, DEBES tener un id_boleto real de una tabla 'boleto'
        // ya insertada. Como no tenemos la lógica de asiento/boleto aquí, asumimos que
        // la columna id_boleto en la tabla 'orden' puede ser NULL temporalmente,
        // o que tienes una lógica para crear el boleto primero (que falta en este servicio).
        
        for (const boleto of boletos) {
            
            // *** AQUÍ DEBERÍA IR LA LÓGICA DE INSERCIÓN EN LA TABLA BOLETO ***
            // Para la prueba, asumiremos que id_boleto en 'orden' puede ser NULL (ya lo pusiste como NULL en tu DDL).
            const id_boleto_real = null; 
            
            total_venta_registrado += boleto.precio;

            // $1: id_boleto (NULL), $2: id_cajero_cobro, $3: total_orden, $4: estado (ENUM)
            const resOrden = await client.query(ordenBoletoQuery, [
                id_boleto_real,
                id_usuario_cajero,
                boleto.precio,
                'Pagada' // Usamos el ENUM 'Pagada'
            ]);
            
            ids_orden_registrados.push(resOrden.rows[0].id_orden);
        }

        // ----------------------------------------------------------------------
        // 3. REGISTRAR COMIDA: Crear una fila en la tabla 'orden' por cada artículo de comida
        // ----------------------------------------------------------------------
        
        // Consulta: id_mesero, id_cajero_cobro, total_orden, estado (id_boleto es NULL)
        const ordenComidaQuery = `
            INSERT INTO orden (id_boleto, id_mesero, id_cajero_cobro, fecha_hora, total_orden, estado)
            VALUES (NULL, $1, $2, NOW(), $3, $4) 
            RETURNING id_orden;
        `;
        
        for (const item of comida) {
            const subtotal = item.precio_unitario * item.cantidad;
            total_venta_registrado += subtotal;

            // $1: id_mesero, $2: id_cajero_cobro, $3: total_orden, $4: estado (ENUM)
            const resOrden = await client.query(ordenComidaQuery, [
                item.id_usuario_mesero, // El mesero del ítem de comida
                id_usuario_cajero,
                subtotal,
                'Pagada' // Usamos el ENUM 'Pagada'
            ]);
            
            const id_orden_comida = resOrden.rows[0].id_orden;
            ids_orden_registrados.push(id_orden_comida);

            // --- Insertar en ORDEN_DETALLE (Detalle del Producto) ---
            // Columnas de tu esquema: idorden, idproducto, cantidad, preciounitarioventa, idpreparador, estadopreparacion
            const detalleComidaQuery = `
                INSERT INTO orden_detalle (id_orden, id_producto, cantidad, precio_unitario_venta, id_preparador, estado_preparacion)
                VALUES ($1, $2, $3, $4, $5, $6);
            `;
            
            // Asumimos que id_preparador es NULL y estado_preparacion es 'Tomada'
            await client.query(detalleComidaQuery, [
                id_orden_comida, 
                item.id_alimento, 
                item.cantidad, 
                item.precio_unitario, 
                null, // id_preparador (NULL)
                'Tomada' // ENUM
            ]);
        }
        // El total general aquí es la suma de los totales individuales

        await client.query('COMMIT'); // 4. Confirmar la transacción
        
        // Devolvemos el ID de la primera orden y el total general de la venta (suma de mini-órdenes)
        return { 
            success: true, 
            id_orden: ids_orden_registrados[0], 
            total: total_venta_registrado 
        };

    } catch (e) {
        await client.query('ROLLBACK'); // 5. Revertir si algo falla
        console.error("Error en la transacción de orden:", e);
        throw e; // Relanzar el error
    } finally {
        client.release(); // 6. Liberar el cliente
    }
};

/**
 * Obtiene las órdenes de comida pendientes de preparación o entrega.
 * CORRECCIÓN: Esta consulta es MUY compleja y sigue ligando de forma errónea
 * O.id_mesero y O.id_boleto. Debería ligar a orden_detalle.
 * La corrección es un cambio de diseño de la consulta que debe ligar a ORDEN_DETALLE para saber qué producto es comida y luego
 * ligar al mesero por la columna id_mesero en la tabla orden.
 */
const getOrdenesPendientes = async (estado) => {
    // La consulta original tiene problemas de diseño (JOINs incorrectos basados en el nuevo modelo).
    // Usaremos una versión simplificada que solo se enfoca en orden_detalle para la comida.
    const query = `
        SELECT
            OD.id_detalle,
            O.id_orden,
            U_M.nombre AS mesero_nombre,
            P.nombre AS producto_nombre,
            OD.cantidad,
            OD.estado_preparacion,
            O.id_mesero,
            O.id_cajero_cobro
            
        FROM
            orden_detalle OD
        JOIN
            orden O ON OD.id_orden = O.id_orden
        LEFT JOIN
            usuario U_M ON O.id_mesero = U_M.id_usuario -- Solo si la orden es de comida
        JOIN
            producto P ON OD.id_producto = P.id_producto
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
    getOrdenesPendientes, 
};