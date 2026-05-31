require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// Conexión DB
const pool = new Pool({
    connectionString: process.env.DATABASE_URL // postgresql://user:pass@host:5432/db
});

// --- MIDDLEWARE AUTH ---
const auth = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.sendStatus(401);
    try {
        const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (e) { res.sendStatus(403); }
};

// --- RUTAS API ---

// 1. Registro / Login
app.post('/api/register', async (req, res) => {
    const { email, password, name } = req.body;
    const hash = await bcrypt.hash(password, 10);
    try {
        const newUser = await pool.query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, couple_id',
            [email, hash, name]
        );
        res.json(newUser.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Obtener Datos de la Pareja (Dashboard)
app.get('/api/dashboard', auth, async (req, res) => {
    // Lógica compleja: Traer hábitos, progreso de hoy de ambos
    const user = req.user;
    
    // 1. Obtener hábitos de la pareja
    const habits = await pool.query(
        'SELECT * FROM habits WHERE couple_id = (SELECT couple_id FROM users WHERE id = $1)',
        [user.id]
    );

    // 2. Obtener logs de HOY de ambos para ver el estado actual (Rojo/Amarillo/Verde)
    const todayLogs = await pool.query(
        `SELECT hl.*, u.name, u.avatar_url FROM habit_logs hl
         JOIN users u ON hl.user_id = u.id
         WHERE hl.date = CURRENT_DATE AND hl.habit_id = ANY($1::uuid[])`,
        [habits.rows.map(h => h.id)]
    );
    
    // Calcular Estado del Día (🟢🟡🔴)
    // Esta lógica se traslada al frontend o se calcula aquí
    
    res.json({ habits: habits.rows, todayLogs: todayLogs.rows });
});

// 3. Completar Hábito (POST)
app.post('/api/habit/complete', auth, async (req, res) => {
    const { habitId, amount } = req.body;
    const userId = req.user.id;

    // Insertar o actualizar log
    await pool.query(
        `INSERT INTO habit_logs (habit_id, user_id, date, completed_amount, status)
         VALUES ($1, $2, NOW(), $3, true)
         ON CONFLICT (habit_id, user_id, date) DO UPDATE SET status = true, completed_amount = $3`,
        [habitId, userId, amount]
    );

    // *** LÓGICA CRÍTICA DE RACHAS COMPARTIDAS ***
    // Verificar si AMBOS completaron este hábito específico hoy
    const partner = await pool.query(
        `SELECT id FROM users WHERE couple_id = (SELECT couple_id FROM users WHERE id = $1) AND id != $1`,
        [userId]
    );
    
    const partnerLog = await pool.query(
        `SELECT status FROM habit_logs WHERE habit_id = $1 AND user_id = $2 AND date = CURRENT_DATE`,
        [habitId, partner.rows[0].id]
    );

    if (partnerLog.rows[0]?.status === true) {
        // AMBOS completaron. ¡AUMENTAR RACHAS!
        // (Aquí iría la lógica para sumar XP, notificar por Socket, etc.)
        io.to(userId).emit('streak_increased', { message: "¡Felicidades! Han aumentado la racha." });
    } else {
        io.to(userId).emit('partner_pending', { message: "Tu pareja aún no completa este hábito." });
    }

    res.json({ success: true, partnerCompleted: partnerLog.rows[0]?.status });
});

// --- SOCKET.IO (Chat y Tiempo Real) ---
io.on('connection', (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on('join_couple', (coupleId) => {
        socket.join(coupleId); // Sala privada por ID de pareja
    });

    socket.on('send_message', async (data) => {
        // data = { coupleId, userId, message }
        const savedMsg = await pool.query(
            'INSERT INTO messages (couple_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [data.coupleId, data.userId, data.message]
        );
        // Broadcast a la sala
        io.to(data.coupleId).emit('receive_message', savedMsg.rows[0]);
    });
});

server.listen(3001, () => console.log('Server running on port 3001'));