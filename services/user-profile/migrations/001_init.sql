CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  first_name_ar VARCHAR(100),
  last_name_ar VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(10),
  photo_url TEXT,
  address JSONB,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  preferred_language VARCHAR(2) DEFAULT 'ar',
  email_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT TRUE,
  theme VARCHAR(20) DEFAULT 'light',
  timezone VARCHAR(50) DEFAULT 'Africa/Cairo',
  preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);
