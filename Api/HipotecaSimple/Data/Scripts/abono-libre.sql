-- Cómo acepta abonos el banco de cada préstamo (ejecutar una sola vez en la base HipotecaSimple)
-- 0 = solo cuotas completas (valor de los préstamos existentes), 1 = cualquier monto
IF COL_LENGTH('dbo.Hipotecas', 'HipoAbonoLibre') IS NULL
ALTER TABLE dbo.Hipotecas ADD HipoAbonoLibre BIT NOT NULL CONSTRAINT DF_Hipotecas_HipoAbonoLibre DEFAULT 0;
