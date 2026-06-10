CREATE TABLE IF NOT EXISTS b4bc_app.network_activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type varchar(80) NOT NULL,
  visibility varchar(40) NOT NULL DEFAULT 'network',
  actor_legacy_member_id bigint,
  related_legacy_member_id bigint,
  requirement_id uuid REFERENCES b4bc_app.requirements(id) ON DELETE SET NULL,
  requirement_response_id uuid REFERENCES b4bc_app.requirement_responses(id) ON DELETE SET NULL,
  partner_connection_id uuid REFERENCES b4bc_app.partner_connections(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES b4bc_app.conversations(id) ON DELETE SET NULL,
  message_id uuid REFERENCES b4bc_app.messages(id) ON DELETE SET NULL,
  notification_id uuid REFERENCES b4bc_app.notifications(id) ON DELETE SET NULL,
  source_table varchar(120) NOT NULL,
  source_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT network_activity_events_type_not_blank CHECK (length(trim(event_type)) > 0),
  CONSTRAINT network_activity_events_visibility_check CHECK (
    visibility IN ('network', 'member', 'private')
  ),
  CONSTRAINT network_activity_events_source_table_not_blank CHECK (length(trim(source_table)) > 0),
  CONSTRAINT network_activity_events_source_id_not_blank CHECK (length(trim(source_id)) > 0)
);

COMMENT ON TABLE b4bc_app.network_activity_events IS 'Canonical app-owned activity stream for dashboard/network events. Legacy member ids reference MySQL members by convention only.';

CREATE INDEX IF NOT EXISTS idx_network_activity_visibility_created
  ON b4bc_app.network_activity_events (visibility, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_network_activity_actor_created
  ON b4bc_app.network_activity_events (actor_legacy_member_id, created_at DESC)
  WHERE actor_legacy_member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_network_activity_source_event_visibility_unique
  ON b4bc_app.network_activity_events (
    source_table,
    source_id,
    event_type,
    visibility
  );

INSERT INTO b4bc_app.network_activity_events (
  event_type,
  visibility,
  actor_legacy_member_id,
  requirement_id,
  source_table,
  source_id,
  payload,
  created_at
)
SELECT
  'requirement_posted',
  'network',
  r.legacy_member_id,
  r.id,
  'b4bc_app.requirements',
  r.id::text,
  jsonb_build_object('requirementTitle', r.title),
  r.created_at
FROM b4bc_app.requirements r
WHERE r.visibility = 'members'
  AND r.status IN ('open', 'matched')
ON CONFLICT (source_table, source_id, event_type, visibility) DO NOTHING;
