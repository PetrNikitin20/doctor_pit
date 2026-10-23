CREATE TABLE task_versions(task_id text NOT NULL REFERENCES tasks, version integer NOT NULL, title text NOT NULL, statement text NOT NULL, tests jsonb NOT NULL, reference_code text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(task_id,version));
INSERT INTO task_versions(task_id,version,title,statement,tests,reference_code) SELECT id,version,title,statement,tests,reference_code FROM tasks;
ALTER TABLE attempts ADD CONSTRAINT attempt_task_version FOREIGN KEY(task_id,task_version) REFERENCES task_versions(task_id,version);
