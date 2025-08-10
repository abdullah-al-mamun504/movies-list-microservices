-- Movies Database Initialization Script

-- Create movies table
CREATE TABLE IF NOT EXISTS movies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    actor VARCHAR(200) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    updated_by VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movies_name ON movies(name);
CREATE INDEX IF NOT EXISTS idx_movies_actor ON movies(actor);
CREATE INDEX IF NOT EXISTS idx_movies_genre ON movies(genre);
CREATE INDEX IF NOT EXISTS idx_movies_updated_by ON movies(updated_by);
CREATE INDEX IF NOT EXISTS idx_movies_created_at ON movies(created_at);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_movies_updated_at 
    BEFORE UPDATE ON movies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO movies (name, actor, genre, description, updated_by) VALUES
('The Matrix', 'Keanu Reeves', 'Sci-Fi', 'A computer hacker learns from mysterious rebels about the true nature of his reality.', 'system'),
('Inception', 'Leonardo DiCaprio', 'Sci-Fi', 'A thief who steals corporate secrets through dream-sharing technology.', 'system'),
('The Godfather', 'Marlon Brando', 'Crime', 'The aging patriarch of an organized crime dynasty transfers control to his reluctant son.', 'system')
ON CONFLICT DO NOTHING;

-- Grant permissions (if needed for specific user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO movies_admin;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO movies_admin;

-- Display table info
\dt
\d movies

-- Success message
SELECT 'Movies database initialized successfully' as status;
