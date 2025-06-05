-- Add sharing columns to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS allow_public_edit BOOLEAN DEFAULT FALSE;

-- Create function to generate share tokens
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create index for share tokens
CREATE INDEX IF NOT EXISTS idx_notes_share_token ON notes(share_token);

-- Create policy for public read access
CREATE POLICY "Public can view shared notes" 
  ON notes FOR SELECT 
  USING (is_public = true);

-- Create policy for public edit access
CREATE POLICY "Public can edit shared notes" 
  ON notes FOR UPDATE 
  USING (is_public = true AND allow_public_edit = true);
