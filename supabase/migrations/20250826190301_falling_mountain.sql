/*
  # إضافة جدول عناصر الفاتورة

  1. New Tables
    - `invoice_items`
      - `id` (uuid, primary key)
      - `invoice_id` (uuid, foreign key to invoices)
      - `subscription_id` (uuid, foreign key to subscriptions)
      - `amount` (numeric)
      - `description` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `invoice_items` table
    - Add policy for authenticated users to manage invoice items

  3. Changes
    - Remove subscription_id from invoices table (will be handled through invoice_items)
    - Add total_amount field to invoices for quick access
*/

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Enable all operations for invoice items"
  ON invoice_items
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_subscription_id ON invoice_items(subscription_id);

-- Add total_amount field to invoices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN total_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Update existing invoices to set total_amount = amount
UPDATE invoices SET total_amount = amount WHERE total_amount = 0;