-- Registro, recuperación de contraseña y perfil (ejecutar una sola vez en la base HipotecaSimple)
-- Solo agrega: no borra ni modifica datos existentes.

-- Correo del usuario (los usuarios actuales quedan sin correo hasta que lo pongan en su perfil)
IF COL_LENGTH('dbo.Usuarios', 'UsuEmail') IS NULL
ALTER TABLE dbo.Usuarios ADD UsuEmail VARCHAR(200) NULL;

-- Enlaces de un solo uso enviados por correo: 'reset' (recuperar contraseña) y 'aprobar' (aprobar registro).
-- Se guarda el hash SHA-256 del enlace, nunca el enlace en sí.
IF OBJECT_ID('dbo.UsuarioTokens', 'U') IS NULL
CREATE TABLE dbo.UsuarioTokens (
    TokId     INT IDENTITY(1,1) PRIMARY KEY,
    UsuId     INT          NOT NULL,
    TokHash   CHAR(64)     NOT NULL,
    TokTipo   VARCHAR(20)  NOT NULL,
    TokExpira DATETIME2    NOT NULL,
    TokUsado  BIT          NOT NULL DEFAULT 0,
    TokFecha  DATETIME2    NOT NULL
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_UsuarioTokens_Hash')
CREATE UNIQUE INDEX UX_UsuarioTokens_Hash ON dbo.UsuarioTokens (TokHash);
