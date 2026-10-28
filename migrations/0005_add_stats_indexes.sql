CREATE  INDEX idx_donations_completed_donor
    ON donations(LOWER(TRIM(user_email)))
    WHERE status = 'completed';


CREATE INDEX idx_donations_user_email ON donations(user_email);
