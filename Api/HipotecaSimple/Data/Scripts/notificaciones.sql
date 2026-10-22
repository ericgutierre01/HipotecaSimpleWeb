-- Tablas para las notificaciones push (ejecutar una sola vez en la base HipotecaSimple)

IF OBJECT_ID('dbo.PushSuscripciones', 'U') IS NULL
CREATE TABLE dbo.PushSuscripciones (
    PushId       INT IDENTITY(1,1) PRIMARY KEY,
    UsuId        INT            NOT NULL,
    PushEndpoint NVARCHAR(800)  NOT NULL,
    PushP256dh   NVARCHAR(200)  NOT NULL,
    PushAuth     NVARCHAR(100)  NOT NULL,
    PushFecha    DATETIME2      NOT NULL
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PushSuscripciones_Endpoint')
CREATE UNIQUE INDEX UX_PushSuscripciones_Endpoint ON dbo.PushSuscripciones (PushEndpoint);

IF OBJECT_ID('dbo.NotificacionesEnviadas', 'U') IS NULL
CREATE TABLE dbo.NotificacionesEnviadas (
    NotiId    INT IDENTITY(1,1) PRIMARY KEY,
    HipoId    INT       NOT NULL,
    NotiMes   INT       NOT NULL,
    NotiTipo  INT       NOT NULL,
    NotiFecha DATETIME2 NOT NULL
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_NotificacionesEnviadas')
CREATE UNIQUE INDEX UX_NotificacionesEnviadas ON dbo.NotificacionesEnviadas (HipoId, NotiMes, NotiTipo);

-- Historial de la campana (una fila por aviso y usuario; se guarda aunque no haya push activado)
IF OBJECT_ID('dbo.Notificaciones', 'U') IS NULL
CREATE TABLE dbo.Notificaciones (
    NotiId     INT IDENTITY(1,1) PRIMARY KEY,
    UsuId      INT            NOT NULL,
    NotiTitulo NVARCHAR(150)  NOT NULL,
    NotiCuerpo NVARCHAR(500)  NOT NULL,
    NotiUrl    NVARCHAR(300)  NOT NULL,
    NotiLeida  BIT            NOT NULL DEFAULT 0,
    NotiFecha  DATETIME2      NOT NULL
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Notificaciones_Usuario')
CREATE INDEX IX_Notificaciones_Usuario ON dbo.Notificaciones (UsuId, NotiFecha DESC);
