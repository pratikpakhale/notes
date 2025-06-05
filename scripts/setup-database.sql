-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add foreign key constraint to link with auth.users
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Set up RLS (Row Level Security)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own notes
CREATE POLICY "Users can only view their own notes" 
  ON notes FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own notes
CREATE POLICY "Users can insert their own notes" 
  ON notes FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own notes
CREATE POLICY "Users can update their own notes" 
  ON notes FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own notes
CREATE POLICY "Users can delete their own notes" 
  ON notes FOR DELETE 
  USING (auth.uid() = user_id);
