-- Update notifications table to allow 'rental_pending_shipment' type
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('subscription_due', 'rental_due', 'rental_overdue', 'rental_pending_shipment'));

