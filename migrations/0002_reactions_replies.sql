-- Reactions (like / haha / angry), one per user per target.
CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    target_type TEXT NOT NULL
        CHECK (target_type IN ('post', 'question', 'answer', 'comment', 'confession')),
    target_id INTEGER NOT NULL,
    kind TEXT NOT NULL
        CHECK (kind IN ('like', 'haha', 'angry')),
    created_at INTEGER NOT NULL,
    UNIQUE (user_id, target_type, target_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(target_type, target_id);

-- Threaded replies + comments on confessions: rebuild comments table
-- (SQLite cannot ALTER a CHECK constraint).
ALTER TABLE comments RENAME TO comments_old;

CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER NOT NULL,
    target_type TEXT NOT NULL
        CHECK (target_type IN ('post', 'question', 'answer', 'confession')),
    target_id INTEGER NOT NULL,
    parent_id INTEGER,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

INSERT INTO comments (id, author_id, target_type, target_id, parent_id, content, created_at, updated_at)
SELECT id, author_id, target_type, target_id, NULL, content, created_at, updated_at FROM comments_old;

DROP TABLE comments_old;

CREATE INDEX idx_comments_target ON comments(target_type, target_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
