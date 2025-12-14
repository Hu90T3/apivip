// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const app = express();
const port = process.env.API_PORT || 3000;

// Importar rutas
const funcionesRoutes = require('./routes/funcionesRoutes');
const ordenesRoutes = require('./routes/ordenesRoutes'); 
const asientosRoutes = require('./routes/asientosRoutes'); // <-- AÑADIR ESTO
const menuRoutes = require('./routes/menuRoutes');         // <-- AÑADIR ESTO
const authRouter = require('./routes/authRoutes');

// Middlewares
app.use(cors()); 
app.use(express.json()); 

// Rutas de la API
app.use('/api/funciones', funcionesRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/asientos', asientosRoutes); // <-- AÑADIR ESTO
app.use('/api/menu', menuRoutes);         // <-- AÑADIR ESTO
app.use('/auth', authRouter);       // Ej: /auth/login <-- Nueva ruta

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API REST de Cinepolis VIP está funcionando. Endpoints: /funciones, /menu, /asientos/:id, /ordenes');
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`🚀 Servidor Express escuchando en http://localhost:${port}`);
    console.log(`Endpoint de prueba: http://localhost:${port}/api/funciones`);
});