-- Safe guest-facing physical-room metadata for room maps and virtual tours.
-- Hotel-service uses Hibernate ddl-auto=update; these statements are also provided
-- for environments that apply controlled SQL migrations before deploying the service.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_side VARCHAR(255);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS view_type VARCHAR(255);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS map_x INTEGER;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS map_y INTEGER;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS panorama_url VARCHAR(1000);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS model3d_url VARCHAR(1000);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS tour_video_url VARCHAR(1000);
