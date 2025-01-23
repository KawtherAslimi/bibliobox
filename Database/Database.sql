-- Database.sql
-- À utiliser seulement si vous ne comptez PAS laisser Django créer les tables
-- Ou bien en adaptant ce script pour éviter les doublons

-- Table pour stocker les emails et codes de vérification
-- CREATE TABLE IF NOT EXISTS VerificationCode (
  --   id INTEGER PRIMARY KEY AUTOINCREMENT,
  --   email TEXT NOT NULL UNIQUE,
    -- generated_code TEXT,
    -- entered_code TEXT,
    -- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour stocker les informations des salles (Box)
-- CREATE TABLE IF NOT EXISTS Box (
   --  id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- name TEXT NOT NULL UNIQUE,
    -- is_available BOOLEAN NOT NULL DEFAULT 1,
    -- availability_date DATE NOT NULL,
    -- availability_time TIME NOT NULL
);

-- Si vous laissez Django gérer la table Reservation, commentez ou supprimez ce qui suit :
-- CREATE TABLE Reservation (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     box_id INTEGER NOT NULL,
--     user TEXT NOT NULL,
--     reservation_date DATE NOT NULL,
--     reservation_time TIME NOT NULL,
--     status TEXT CHECK(status IN ('en cours', 'futur', 'passée')) NOT NULL,
--     action TEXT CHECK(action IN ('annulée', 'confirmée')) DEFAULT 'confirmée',
--     FOREIGN KEY (box_id) REFERENCES Box (id) ON DELETE CASCADE
-- );

-- Si vous laissez Django gérer la table StudentProfile, commentez ou supprimez :
-- CREATE TABLE StudentProfile (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     email VARCHAR(254) NOT NULL UNIQUE,
--     student_number VARCHAR(50) NOT NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TRIGGER update_studentprofile_updated_at
-- AFTER UPDATE ON StudentProfile
-- FOR EACH ROW
-- BEGIN
--     UPDATE StudentProfile
--     SET updated_at = CURRENT_TIMESTAMP
--     WHERE id = OLD.id;
-- END;
