CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS b4bc_app;

COMMENT ON SCHEMA b4bc_app IS 'Application-owned Postgres tables for B4BC Connect features. Member identity remains in the legacy directory database.';

CREATE OR REPLACE FUNCTION b4bc_app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS b4bc_app.member_profiles (
  legacy_member_id bigint PRIMARY KEY,
  headline varchar(160),
  about text,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_completion smallint NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_profiles_completion_range CHECK (
    profile_completion >= 0
    AND profile_completion <= 100
  )
);

COMMENT ON COLUMN b4bc_app.member_profiles.legacy_member_id IS 'Member id from the legacy member directory. This is intentionally not a foreign key because the source system is a separate database.';

CREATE TABLE IF NOT EXISTS b4bc_app.member_preferences (
  legacy_member_id bigint PRIMARY KEY,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  directory_visibility text NOT NULL DEFAULT 'members',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT member_preferences_visibility_check CHECK (
    directory_visibility IN ('members', 'connections', 'hidden')
  )
);

CREATE TABLE IF NOT EXISTS b4bc_app.requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_member_id bigint NOT NULL,
  title varchar(160) NOT NULL,
  body text NOT NULL,
  industry_segment_id integer,
  zone_name varchar(120),
  status text NOT NULL DEFAULT 'open',
  visibility text NOT NULL DEFAULT 'members',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  CONSTRAINT requirements_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT requirements_body_not_blank CHECK (length(trim(body)) > 0),
  CONSTRAINT requirements_status_check CHECK (
    status IN ('draft', 'open', 'matched', 'closed', 'archived')
  ),
  CONSTRAINT requirements_visibility_check CHECK (
    visibility IN ('members', 'chapter', 'private')
  ),
  CONSTRAINT requirements_closed_state_check CHECK (
    closed_at IS NULL
    OR status IN ('matched', 'closed', 'archived')
  )
);

CREATE TABLE IF NOT EXISTS b4bc_app.requirement_tags (
  requirement_id uuid NOT NULL REFERENCES b4bc_app.requirements(id) ON DELETE CASCADE,
  tag varchar(60) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (requirement_id, tag),
  CONSTRAINT requirement_tags_tag_not_blank CHECK (length(trim(tag)) > 0)
);

CREATE TABLE IF NOT EXISTS b4bc_app.requirement_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES b4bc_app.requirements(id) ON DELETE CASCADE,
  uploaded_by_legacy_member_id bigint NOT NULL,
  file_name varchar(255) NOT NULL,
  file_url text NOT NULL,
  file_type varchar(120),
  file_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT requirement_attachments_file_name_not_blank CHECK (length(trim(file_name)) > 0),
  CONSTRAINT requirement_attachments_file_url_not_blank CHECK (length(trim(file_url)) > 0),
  CONSTRAINT requirement_attachments_file_size_check CHECK (
    file_size_bytes IS NULL
    OR file_size_bytes >= 0
  )
);

CREATE TABLE IF NOT EXISTS b4bc_app.requirement_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES b4bc_app.requirements(id) ON DELETE CASCADE,
  responder_legacy_member_id bigint NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'interested',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT requirement_responses_status_check CHECK (
    status IN ('interested', 'shortlisted', 'connected', 'rejected', 'withdrawn')
  ),
  CONSTRAINT requirement_responses_member_unique UNIQUE (
    requirement_id,
    responder_legacy_member_id
  )
);

CREATE TABLE IF NOT EXISTS b4bc_app.requirement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES b4bc_app.requirements(id) ON DELETE CASCADE,
  legacy_member_id bigint NOT NULL,
  parent_comment_id uuid REFERENCES b4bc_app.requirement_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT requirement_comments_body_not_blank CHECK (length(trim(body)) > 0)
);

CREATE TABLE IF NOT EXISTS b4bc_app.feed_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES b4bc_app.requirements(id) ON DELETE CASCADE,
  legacy_member_id bigint NOT NULL,
  reaction text NOT NULL DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_reactions_reaction_check CHECK (
    reaction IN ('like', 'support', 'insightful')
  ),
  CONSTRAINT feed_reactions_member_unique UNIQUE (
    requirement_id,
    legacy_member_id,
    reaction
  )
);

CREATE TABLE IF NOT EXISTS b4bc_app.saved_partners (
  legacy_member_id bigint NOT NULL,
  saved_legacy_member_id bigint NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (legacy_member_id, saved_legacy_member_id),
  CONSTRAINT saved_partners_not_self CHECK (
    legacy_member_id <> saved_legacy_member_id
  )
);

CREATE TABLE IF NOT EXISTS b4bc_app.partner_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_legacy_member_id bigint NOT NULL,
  receiver_legacy_member_id bigint NOT NULL,
  member_low_id bigint GENERATED ALWAYS AS (
    LEAST(requester_legacy_member_id, receiver_legacy_member_id)
  ) STORED,
  member_high_id bigint GENERATED ALWAYS AS (
    GREATEST(requester_legacy_member_id, receiver_legacy_member_id)
  ) STORED,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT partner_connections_not_self CHECK (
    requester_legacy_member_id <> receiver_legacy_member_id
  ),
  CONSTRAINT partner_connections_status_check CHECK (
    status IN ('pending', 'accepted', 'declined', 'blocked', 'cancelled')
  ),
  CONSTRAINT partner_connections_pair_unique UNIQUE (member_low_id, member_high_id)
);

CREATE TABLE IF NOT EXISTS b4bc_app.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct',
  requirement_id uuid REFERENCES b4bc_app.requirements(id) ON DELETE SET NULL,
  connection_id uuid REFERENCES b4bc_app.partner_connections(id) ON DELETE SET NULL,
  created_by_legacy_member_id bigint NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_type_check CHECK (
    type IN ('direct', 'requirement', 'connection')
  ),
  CONSTRAINT conversations_requirement_type_check CHECK (
    requirement_id IS NULL
    OR type = 'requirement'
  ),
  CONSTRAINT conversations_connection_type_check CHECK (
    connection_id IS NULL
    OR type = 'connection'
  )
);

CREATE TABLE IF NOT EXISTS b4bc_app.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES b4bc_app.conversations(id) ON DELETE CASCADE,
  legacy_member_id bigint NOT NULL,
  role text NOT NULL DEFAULT 'member',
  last_read_message_id uuid,
  muted_until timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  PRIMARY KEY (conversation_id, legacy_member_id),
  CONSTRAINT conversation_participants_role_check CHECK (
    role IN ('member', 'admin')
  )
);

CREATE TABLE IF NOT EXISTS b4bc_app.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES b4bc_app.conversations(id) ON DELETE CASCADE,
  sender_legacy_member_id bigint NOT NULL,
  body text,
  message_type text NOT NULL DEFAULT 'text',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT messages_type_check CHECK (
    message_type IN ('text', 'system', 'attachment')
  ),
  CONSTRAINT messages_body_or_non_text CHECK (
    message_type <> 'text'
    OR length(trim(COALESCE(body, ''))) > 0
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversation_participants_last_read_message_id_fkey'
      AND conrelid = 'b4bc_app.conversation_participants'::regclass
  ) THEN
    ALTER TABLE b4bc_app.conversation_participants
      ADD CONSTRAINT conversation_participants_last_read_message_id_fkey
      FOREIGN KEY (last_read_message_id)
      REFERENCES b4bc_app.messages(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS b4bc_app.message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES b4bc_app.messages(id) ON DELETE CASCADE,
  file_name varchar(255) NOT NULL,
  file_url text NOT NULL,
  file_type varchar(120),
  file_size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_attachments_file_name_not_blank CHECK (length(trim(file_name)) > 0),
  CONSTRAINT message_attachments_file_url_not_blank CHECK (length(trim(file_url)) > 0),
  CONSTRAINT message_attachments_file_size_check CHECK (
    file_size_bytes IS NULL
    OR file_size_bytes >= 0
  )
);

CREATE TABLE IF NOT EXISTS b4bc_app.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_member_id bigint NOT NULL,
  type varchar(80) NOT NULL,
  actor_legacy_member_id bigint,
  requirement_id uuid REFERENCES b4bc_app.requirements(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES b4bc_app.conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES b4bc_app.messages(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT notifications_type_not_blank CHECK (length(trim(type)) > 0),
  CONSTRAINT notifications_read_at_check CHECK (
    is_read
    OR read_at IS NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_member_profiles_verified
  ON b4bc_app.member_profiles (is_verified);

CREATE INDEX IF NOT EXISTS idx_requirements_status_created
  ON b4bc_app.requirements (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requirements_industry_status_created
  ON b4bc_app.requirements (industry_segment_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requirements_member_created
  ON b4bc_app.requirements (legacy_member_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requirement_attachments_requirement
  ON b4bc_app.requirement_attachments (requirement_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requirement_responses_requirement_status
  ON b4bc_app.requirement_responses (requirement_id, status);

CREATE INDEX IF NOT EXISTS idx_requirement_responses_responder_status
  ON b4bc_app.requirement_responses (responder_legacy_member_id, status);

CREATE INDEX IF NOT EXISTS idx_requirement_comments_requirement_created
  ON b4bc_app.requirement_comments (requirement_id, created_at);

CREATE INDEX IF NOT EXISTS idx_feed_reactions_requirement
  ON b4bc_app.feed_reactions (requirement_id);

CREATE INDEX IF NOT EXISTS idx_saved_partners_saved_member
  ON b4bc_app.saved_partners (saved_legacy_member_id);

CREATE INDEX IF NOT EXISTS idx_partner_connections_receiver_status_created
  ON b4bc_app.partner_connections (receiver_legacy_member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_connections_requester_status_created
  ON b4bc_app.partner_connections (requester_legacy_member_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_requirement
  ON b4bc_app.conversations (requirement_id)
  WHERE requirement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_connection
  ON b4bc_app.conversations (connection_id)
  WHERE connection_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_participants_member_joined
  ON b4bc_app.conversation_participants (legacy_member_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON b4bc_app.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message
  ON b4bc_app.message_attachments (message_id);

CREATE INDEX IF NOT EXISTS idx_notifications_member_unread_created
  ON b4bc_app.notifications (legacy_member_id, is_read, created_at DESC);

DROP TRIGGER IF EXISTS trg_member_profiles_updated_at ON b4bc_app.member_profiles;
CREATE TRIGGER trg_member_profiles_updated_at
  BEFORE UPDATE ON b4bc_app.member_profiles
  FOR EACH ROW
  EXECUTE FUNCTION b4bc_app.set_updated_at();

DROP TRIGGER IF EXISTS trg_member_preferences_updated_at ON b4bc_app.member_preferences;
CREATE TRIGGER trg_member_preferences_updated_at
  BEFORE UPDATE ON b4bc_app.member_preferences
  FOR EACH ROW
  EXECUTE FUNCTION b4bc_app.set_updated_at();

DROP TRIGGER IF EXISTS trg_requirements_updated_at ON b4bc_app.requirements;
CREATE TRIGGER trg_requirements_updated_at
  BEFORE UPDATE ON b4bc_app.requirements
  FOR EACH ROW
  EXECUTE FUNCTION b4bc_app.set_updated_at();

DROP TRIGGER IF EXISTS trg_requirement_responses_updated_at ON b4bc_app.requirement_responses;
CREATE TRIGGER trg_requirement_responses_updated_at
  BEFORE UPDATE ON b4bc_app.requirement_responses
  FOR EACH ROW
  EXECUTE FUNCTION b4bc_app.set_updated_at();

DROP TRIGGER IF EXISTS trg_partner_connections_updated_at ON b4bc_app.partner_connections;
CREATE TRIGGER trg_partner_connections_updated_at
  BEFORE UPDATE ON b4bc_app.partner_connections
  FOR EACH ROW
  EXECUTE FUNCTION b4bc_app.set_updated_at();

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON b4bc_app.conversations;
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON b4bc_app.conversations
  FOR EACH ROW
  EXECUTE FUNCTION b4bc_app.set_updated_at();
