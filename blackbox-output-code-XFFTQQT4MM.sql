-- USUARIOS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(100),
    avatar_url TEXT,
    couple_id UUID, -- FK a la misma tabla (autoreferencia) o a una tabla de parejas
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    lives_saved INT DEFAULT 1, -- Salvavidas mensual
    created_at TIMESTAMP DEFAULT NOW()
);

-- PAREJAS
CREATE TABLE couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code VARCHAR(20) UNIQUE NOT NULL, -- Código de invitación
    streak_current INT DEFAULT 0,
    streak_best INT DEFAULT 0,
    last_check_date DATE
);

-- HÁBITOS COMPARTIDOS
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES couples(id),
    title VARCHAR(255),
    description TEXT,
    icon VARCHAR(50),
    frequency VARCHAR(20) DEFAULT 'daily', -- daily, weekly
    target_time TIME,
    created_at TIMESTAMP DEFAULT NOW()
);

-- REGISTRO DE HÁBITOS (LOG)
-- Aquí es donde ocurre la magia. Debe haber 1 registro por persona por día por hábito.
CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID REFERENCES habits(id),
    user_id UUID REFERENCES users(id),
    date DATE,
    completed_amount INT, -- Ej: 500 abdominales
    status BOOLEAN DEFAULT FALSE, -- false = pendiente/incompleto, true = hecho
    UNIQUE(habit_id, user_id, date) -- Evita duplicados
);

-- MENSAJES (CHAT)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID REFERENCES couples(id),
    user_id UUID REFERENCES users(id),
    content TEXT,
    type VARCHAR(20) DEFAULT 'text', -- text, image, gif
    created_at TIMESTAMP DEFAULT NOW()
);