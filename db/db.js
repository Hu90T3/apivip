// db/db.js
// Carga las variables de entorno (incluida DATABASE_URL)
require('dotenv').config();
const { Pool } = require('pg');

// Usamos la DATABASE_URL completa de Railway para configurar el pool.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Opcional: Aumentar el tiempo de espera si la conexión a Railway es lenta
    // connectionTimeoutMillis: 5000, 
});

pool.on('connect', () => {
    console.log('✅ Conexión establecida a PostgreSQL (Railway).');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado o desconexión en el pool de PostgreSQL:', err);
  // Si hay un error fatal, salimos del proceso
  process.exit(-1);
});

// Exportamos el pool para que el archivo 'services' pueda ejecutar consultas
module.exports = {
    // Método simplificado para ejecutar consultas con o sin parámetros
    query: (text, params) => pool.query(text, params),
    pool: pool
};