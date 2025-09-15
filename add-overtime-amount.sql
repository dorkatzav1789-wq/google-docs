-- הוספת שדה שעות נוספות לטבלת work_hours
ALTER TABLE work_hours ADD COLUMN IF NOT EXISTS overtime_amount DECIMAL(10,2) DEFAULT 0;

-- עדכון הערות על השינוי
COMMENT ON COLUMN work_hours.overtime_amount IS 'סכום שעות נוספות ליום העבודה';
