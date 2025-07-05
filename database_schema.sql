-- Transaction Attachments Table
-- This table stores metadata about files uploaded for transactions
CREATE TABLE IF NOT EXISTS transaction_attachments (
    id SERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    description TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_transaction_id ON transaction_attachments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_attachments_user_id ON transaction_attachments(user_id);

-- Disable Row Level Security for now (using custom auth)
ALTER TABLE transaction_attachments DISABLE ROW LEVEL SECURITY;

-- Create storage bucket for transaction attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('transaction-attachments', 'transaction-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for transaction attachments bucket
-- Allow authenticated users to manage files in the bucket
CREATE POLICY "Authenticated users can manage transaction attachments" ON storage.objects
    FOR ALL USING (
        bucket_id = 'transaction-attachments' 
        AND auth.role() = 'authenticated'
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_transaction_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_transaction_attachments_updated_at
    BEFORE UPDATE ON transaction_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_attachments_updated_at(); 