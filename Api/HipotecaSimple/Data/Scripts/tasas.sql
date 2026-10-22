-- Cambios de tasa (ejecutar una sola vez en la base HipotecaSimple). Solo agrega: no borra ni modifica datos.

-- Meses con tasa fija desde el inicio (NULL = fija todo el plazo). Ej.: 36 = fija 3 años, la cuota #37 ya es variable.
IF COL_LENGTH('dbo.Hipotecas', 'HipoMesesFijos') IS NULL
ALTER TABLE dbo.Hipotecas ADD HipoMesesFijos INT NULL;

-- Qué hace el banco con los abonos: 0 = reduce el plazo (cuota igual), 1 = reduce la cuota (mismo plazo)
IF COL_LENGTH('dbo.Hipotecas', 'HipoReduceCuota') IS NULL
ALTER TABLE dbo.Hipotecas ADD HipoReduceCuota BIT NOT NULL CONSTRAINT DF_Hipotecas_HipoReduceCuota DEFAULT 0;

-- Historial de tasas: desde la cuota N el préstamo paga la tasa X%. La tasa inicial sigue en Hipotecas.HipoInteres.
IF OBJECT_ID('dbo.TasasHipoteca', 'U') IS NULL
CREATE TABLE dbo.TasasHipoteca (
    TasaId         INT IDENTITY(1,1) PRIMARY KEY,
    HipoId         INT           NOT NULL,
    TasaDesdeCuota INT           NOT NULL,
    TasaValor      DECIMAL(9,4)  NOT NULL,
    TasaFecha      DATETIME2     NOT NULL
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_TasasHipoteca')
CREATE UNIQUE INDEX UX_TasasHipoteca ON dbo.TasasHipoteca (HipoId, TasaDesdeCuota);
