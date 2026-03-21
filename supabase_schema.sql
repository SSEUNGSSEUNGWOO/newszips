CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  video_id TEXT UNIQUE NOT NULL,
  company TEXT NOT NULL,
  title TEXT,
  description TEXT,
  transcript TEXT,
  topic TEXT,
  topic_proba JSONB,
  keywords TEXT[],
  summary TEXT,
  view_count INTEGER,
  upload_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_company ON articles(company);
CREATE INDEX idx_articles_topic ON articles(topic);
CREATE INDEX idx_articles_upload_date ON articles(upload_date DESC);
