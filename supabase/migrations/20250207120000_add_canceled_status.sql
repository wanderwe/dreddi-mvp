-- Extend promises status lifecycle with canceled
ALTER TABLE promises DROP CONSTRAINT IF EXISTS promises_status_valid;
ALTER TABLE promises
  ADD CONSTRAINT promises_status_valid
  CHECK (status IN ('active','completed_by_promisor','confirmed','disputed','fulfilled','broken','canceled'));
