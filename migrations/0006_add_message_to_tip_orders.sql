-- Migracion 0006: Agregar columna message a tip_orders
-- Permite que los tips alimenten el muro de reconocimiento unificado
-- junto con las donaciones (2026-11-21)

-- Columna nullable: los tips existentes no tienen mensaje (se llena despues del pago en /thank-you)
ALTER TABLE tip_orders ADD COLUMN message TEXT;

-- Indice parcial para el muro de reconocimiento: solo filas con mensaje
-- (mismo patron que idx_donations_message)
CREATE INDEX idx_tip_orders_message ON tip_orders(id) WHERE message IS NOT NULL;
