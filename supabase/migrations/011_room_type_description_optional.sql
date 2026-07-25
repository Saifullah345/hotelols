-- Make room_type description optional (nullable)
ALTER TABLE room_types ALTER COLUMN description DROP NOT NULL;
ALTER TABLE room_types ALTER COLUMN description SET DEFAULT NULL;
