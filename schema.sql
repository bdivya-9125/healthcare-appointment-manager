@"
CREATE TABLE users(
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT,
  google_tokens JSONB
);

CREATE TABLE doctors(
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  specialisation TEXT,
  working_hours JSONB,
  slot_duration_min INT
);

CREATE TABLE doctor_leaves(
  id SERIAL PRIMARY KEY,
  doctor_id INT REFERENCES doctors(id),
  leave_date DATE
);

CREATE TABLE slots(
  id SERIAL PRIMARY KEY,
  doctor_id INT REFERENCES doctors(id),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status TEXT DEFAULT 'open'
);

CREATE TABLE appointments(
  id SERIAL PRIMARY KEY,
  slot_id INT UNIQUE REFERENCES slots(id),
  patient_id INT REFERENCES users(id),
  symptom_form TEXT,
  pre_visit_summary JSONB,
  post_visit_notes TEXT,
  prescription JSONB,
  post_visit_summary TEXT,
  status TEXT DEFAULT 'confirmed',
  calendar_event_id TEXT
);

CREATE TABLE notifications_log(
  id SERIAL PRIMARY KEY,
  type TEXT,
  recipient TEXT,
  payload JSONB,
  status TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
"@ | Out-File -FilePath schema.sql -Encoding utf8