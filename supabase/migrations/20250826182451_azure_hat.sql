/*
  # Add subscription-purchase relationship

  1. Changes
    - Add purchase_id column to subscriptions table if it doesn't exist
    - Add foreign key constraint between subscriptions and purchases
    - Add index for better performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add purchase_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'purchase_id'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN purchase_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_purchase_id_fkey'
  ) THEN
    ALTER TABLE subscriptions 
    ADD CONSTRAINT subscriptions_purchase_id_fkey 
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_purchase_id ON subscriptions(purchase_id);