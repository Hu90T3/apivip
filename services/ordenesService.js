// services/ordenesService.js
const db = require('../db/db');

const crearOrdenCompleta = async (datosOrden) => {
    const client = await db.pool.connect(); 
    
    // Desestructuración de datos
    const { id_funcion, id_usuario_cajero, boletos, comida } = datosOrden;
    let total_venta_registrado = 0; 
    const ids_orden_registrados = [];

    try {
        await client.query('BEGIN'); // 1. Iniciar la transacción

        // ----------------------------------------------------------------------
        // 2. REGISTRAR BOLETOS (Mini-órdenes)
        // Solución al error: id_mesero NOT NULL. Usamos el id_cajero_cobro para id_mesero.
        // ----------------------------------------------------------------------
        
        const ordenBoletoQuery = `
            INSERT INTO orden (id_boleto, id_mesero, id_cajero_cobro, fecha_hora, total_orden, estado)
            VALUES ($1, $2, $3, NOW(), $4, $5) 
            RETURNING id_orden;
        `;
        
        for (const boleto of boletos) {
            
            const id_boleto_real = null; // Asumiendo que el campo es NULLable
            total_venta_registrado += boleto.precio;

            // $1: id_boleto (NULL), $2: id_mesero (ID del Cajero), $3: id_cajero_cobro, $4: total_orden, $5: estado
            const resOrden = await client.query(ordenBoletoQuery, [
                id_boleto_real,
                id_usuario_cajero, // Usamos el cajero como mesero (soluciona NOT NULL)
                id_usuario_cajero,
                boleto.precio,
                'Pagada' // ENUM
            ]);
            
            ids_orden_registrados.push(resOrden.rows[0].id_orden);
        }

        // ----------------------------------------------------------------------
        // 3. REGISTRAR COMIDA (Mini-órdenes y Detalle)
        // Solución al error: id_producto NOT NULL. Usamos item.id_producto.
        // ----------------------------------------------------------------------
        
        const ordenComidaQuery = `
            INSERT INTO orden (id_boleto, id_mesero, id_cajero_cobro, fecha_hora, total_orden, estado)
            VALUES (NULL, $1, $2, NOW(), $3, $4) 
            RETURNING id_orden;
        `;
        
        for (const item of comida) {
            
            // Verificamos que id_producto exista y si no, fallamos con un error claro.
            const productoIdAInsertar = item.id_producto; 
            
            if (!productoIdAInsertar) {
                // Esta línea no debería ejecutarse si Android envía correctamente
                throw new Error("El campo id_producto del JSON de comida es nulo o indefinido. Verifique la clase ComidaRequest en Android.");
            }
            
            const subtotal = item.precio_unitario * item.cantidad;
            total_venta_registrado += subtotal;

            // $1: id_mesero, $2: id_cajero_cobro, $3: total_orden, $4: estado
            const resOrden = await client.query(ordenComidaQuery, [
                item.id_usuario_mesero, 
                id_usuario_cajero,
                subtotal,
                'Pagada' // ENUM
            ]);
            
            const id_orden_comida = resOrden.rows[0].id_orden;
            ids_orden_registrados.push(id_orden_comida);

            // --- Insertar en ORDEN_DETALLE ---
            const detalleComidaQuery = `
                INSERT INTO orden_detalle (id_orden, id_producto, cantidad, precio_unitario_venta, id_preparador, estado_preparacion)
                VALUES ($1, $2, $3, $4, $5, $6);
            `;
            
            await client.query(detalleComidaQuery, [
                id_orden_comida, 
                productoIdAInsertar, // <-- Garantizado que tiene valor
                item.cantidad, 
                item.precio_unitario, 
                null, // id_preparador
                'Tomada' // ENUM
            ]);
        }

        await client.query('COMMIT'); 
        
        return { 
            success: true, 
            id_orden: ids_orden_registrados[0], 
            total: total_venta_registrado 
        };

    } catch (e) {
        await client.query('ROLLBACK'); 
        console.error("Error en la transacción de orden:", e);
        throw e; 
    } finally {
        client.release(); 
    }

    
};

const crearSoloOrdenComida = async ({ id_cajero, total, metodo_pago, productos }) => {
    const client = await db.pool.connect(); 
    try {
        await client.query('BEGIN'); // 1. Iniciar la transacción

        // A. INSERTAR EN TABLA ORDEN
        const ordenQuery = `
            INSERT INTO orden (id_boleto, id_mesero, id_cajero_cobro, fecha_hora, total_orden, estado)
            VALUES (NULL, $1, $1, NOW(), $2, 'Pagada') 
            RETURNING id_orden;
        `;
        const ordenResult = await client.query(ordenQuery, [id_cajero, total]);
        const id_orden = ordenResult.rows[0].id_orden;

        // B. INSERTAR EN TABLA ORDEN_DETALLE
        const detalleQueries = productos.map(p => {
            return client.query(
                `INSERT INTO orden_detalle (id_orden, id_producto, cantidad, precio_unitario_venta, estado_preparacion)
                 VALUES ($1, $2, $3, $4, 'Tomada');`,
                [id_orden, p.id_producto, p.cantidad, p.precio] 
            );
        });
        await Promise.all(detalleQueries);

        // C. INSERTAR EN TABLA PAGO
        const pagoQuery = `
            INSERT INTO pago (id_orden, monto, metodo, fecha_pago)
            VALUES ($1, $2, $3, NOW());
        `;
        await client.query(pagoQuery, [id_orden, total, metodo_pago]);
        
        await client.query('COMMIT'); 
        
        return id_orden;

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error("Transacción fallida al crear orden de comida:", error);
        throw new Error("Error en la BD al registrar la orden de comida.");

    } finally {
        client.release();
    }
};

// ... (getOrdenesPendientes se queda igual o se elimina si no se usa)

module.exports = {
    crearOrdenCompleta,
    crearSoloOrdenComida,
};