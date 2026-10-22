-- Revisión periódica de la tasa y tipo de abono por pago (ejecutar una sola vez). Solo agrega: no borra datos.

-- Cada cuántos meses revisa el banco la tasa después del periodo fijo (NULL = no se revisa). Ej.: 6 = cada semestre
IF COL_LENGTH('dbo.Hipotecas', 'HipoMesesRevision') IS NULL
ALTER TABLE dbo.Hipotecas ADD HipoMesesRevision INT NULL;
GO

-- Qué hizo cada abono a capital: 0 = redujo el plazo, 1 = redujo la cuota (el contrato deja elegir en cada abono)
IF COL_LENGTH('dbo.Pagos', 'PagoReduceCuota') IS NULL
BEGIN
    ALTER TABLE dbo.Pagos ADD PagoReduceCuota BIT NOT NULL CONSTRAINT DF_Pagos_PagoReduceCuota DEFAULT 0;
    -- Los pagos que ya existían siguen la preferencia que tenía su préstamo
    EXEC('UPDATE p SET PagoReduceCuota = h.HipoReduceCuota FROM dbo.Pagos p JOIN dbo.Hipotecas h ON h.HipoId = p.HipoId');
END
