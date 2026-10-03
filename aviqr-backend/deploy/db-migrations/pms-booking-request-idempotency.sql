-- Prevent duplicate public PMS reservations when the booking-engine retries a request.
ALTER TABLE pms_reservations ADD COLUMN IF NOT EXISTS booking_request_id VARCHAR(36);
CREATE UNIQUE INDEX IF NOT EXISTS uk_pms_reservations_booking_request_id
    ON pms_reservations(booking_request_id)
    WHERE booking_request_id IS NOT NULL;
