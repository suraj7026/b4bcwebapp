CREATE TABLE IF NOT EXISTS b4bc_app_member_profiles (
  legacy_member_id BIGINT NOT NULL,
  headline VARCHAR(160),
  about TEXT,
  services LONGTEXT NOT NULL DEFAULT '[]' CHECK (JSON_VALID(services)),
  profile_completion SMALLINT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  metadata LONGTEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(metadata)),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (legacy_member_id),
  CONSTRAINT chk_b4bc_mp_completion CHECK (
    profile_completion >= 0
    AND profile_completion <= 100
  ),
  KEY idx_b4bc_mp_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_member_preferences (
  legacy_member_id BIGINT NOT NULL,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  directory_visibility VARCHAR(40) NOT NULL DEFAULT 'members',
  metadata LONGTEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(metadata)),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (legacy_member_id),
  CONSTRAINT chk_b4bc_prefs_visibility CHECK (
    directory_visibility IN ('members', 'connections', 'hidden')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_requirements (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  legacy_member_id BIGINT NOT NULL,
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  industry_segment_id INT,
  zone_name VARCHAR(120),
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  visibility VARCHAR(40) NOT NULL DEFAULT 'members',
  metadata LONGTEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(metadata)),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_req_title CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  CONSTRAINT chk_b4bc_req_body CHECK (CHAR_LENGTH(TRIM(body)) > 0),
  CONSTRAINT chk_b4bc_req_status CHECK (
    status IN ('draft', 'open', 'matched', 'closed', 'archived')
  ),
  CONSTRAINT chk_b4bc_req_visibility CHECK (
    visibility IN ('members', 'chapter', 'private')
  ),
  CONSTRAINT chk_b4bc_req_closed_state CHECK (
    closed_at IS NULL
    OR status IN ('matched', 'closed', 'archived')
  ),
  KEY idx_b4bc_req_status_created (status, created_at),
  KEY idx_b4bc_req_industry_status_created (industry_segment_id, status, created_at),
  KEY idx_b4bc_req_member_created (legacy_member_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_requirement_tags (
  requirement_id CHAR(36) NOT NULL,
  tag VARCHAR(60) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (requirement_id, tag),
  CONSTRAINT chk_b4bc_req_tag CHECK (CHAR_LENGTH(TRIM(tag)) > 0),
  CONSTRAINT fk_b4bc_req_tags_requirement
    FOREIGN KEY (requirement_id)
    REFERENCES b4bc_app_requirements(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_requirement_attachments (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  requirement_id CHAR(36) NOT NULL,
  uploaded_by_legacy_member_id BIGINT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(120),
  file_size_bytes BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_req_att_name CHECK (CHAR_LENGTH(TRIM(file_name)) > 0),
  CONSTRAINT chk_b4bc_req_att_url CHECK (CHAR_LENGTH(TRIM(file_url)) > 0),
  CONSTRAINT chk_b4bc_req_att_size CHECK (
    file_size_bytes IS NULL
    OR file_size_bytes >= 0
  ),
  CONSTRAINT fk_b4bc_req_att_requirement
    FOREIGN KEY (requirement_id)
    REFERENCES b4bc_app_requirements(id)
    ON DELETE CASCADE,
  KEY idx_b4bc_req_att_requirement (requirement_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_requirement_responses (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  requirement_id CHAR(36) NOT NULL,
  responder_legacy_member_id BIGINT NOT NULL,
  message TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'interested',
  metadata LONGTEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(metadata)),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_req_resp_status CHECK (
    status IN ('interested', 'shortlisted', 'connected', 'rejected', 'withdrawn')
  ),
  CONSTRAINT fk_b4bc_req_resp_requirement
    FOREIGN KEY (requirement_id)
    REFERENCES b4bc_app_requirements(id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_b4bc_req_resp_member (requirement_id, responder_legacy_member_id),
  KEY idx_b4bc_req_resp_status (requirement_id, status),
  KEY idx_b4bc_req_resp_responder (responder_legacy_member_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_requirement_comments (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  requirement_id CHAR(36) NOT NULL,
  legacy_member_id BIGINT NOT NULL,
  parent_comment_id CHAR(36),
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_req_comment_body CHECK (CHAR_LENGTH(TRIM(body)) > 0),
  CONSTRAINT fk_b4bc_req_comment_requirement
    FOREIGN KEY (requirement_id)
    REFERENCES b4bc_app_requirements(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_b4bc_req_comment_parent
    FOREIGN KEY (parent_comment_id)
    REFERENCES b4bc_app_requirement_comments(id)
    ON DELETE CASCADE,
  KEY idx_b4bc_req_comment_created (requirement_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_feed_reactions (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  requirement_id CHAR(36) NOT NULL,
  legacy_member_id BIGINT NOT NULL,
  reaction VARCHAR(40) NOT NULL DEFAULT 'like',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_feed_reaction CHECK (
    reaction IN ('like', 'support', 'insightful')
  ),
  CONSTRAINT fk_b4bc_feed_reaction_requirement
    FOREIGN KEY (requirement_id)
    REFERENCES b4bc_app_requirements(id)
    ON DELETE CASCADE,
  UNIQUE KEY uq_b4bc_feed_reaction_member (requirement_id, legacy_member_id, reaction),
  KEY idx_b4bc_feed_reaction_requirement (requirement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_saved_partners (
  legacy_member_id BIGINT NOT NULL,
  saved_legacy_member_id BIGINT NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (legacy_member_id, saved_legacy_member_id),
  CONSTRAINT chk_b4bc_saved_not_self CHECK (
    legacy_member_id <> saved_legacy_member_id
  ),
  KEY idx_b4bc_saved_partner_saved (saved_legacy_member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_partner_connections (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  requester_legacy_member_id BIGINT NOT NULL,
  receiver_legacy_member_id BIGINT NOT NULL,
  member_low_id BIGINT GENERATED ALWAYS AS (
    LEAST(requester_legacy_member_id, receiver_legacy_member_id)
  ) STORED,
  member_high_id BIGINT GENERATED ALWAYS AS (
    GREATEST(requester_legacy_member_id, receiver_legacy_member_id)
  ) STORED,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_conn_not_self CHECK (
    requester_legacy_member_id <> receiver_legacy_member_id
  ),
  CONSTRAINT chk_b4bc_conn_status CHECK (
    status IN ('pending', 'accepted', 'declined', 'blocked', 'cancelled')
  ),
  UNIQUE KEY uq_b4bc_conn_pair (member_low_id, member_high_id),
  KEY idx_b4bc_conn_receiver (receiver_legacy_member_id, status, created_at),
  KEY idx_b4bc_conn_requester (requester_legacy_member_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_conversations (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  type VARCHAR(40) NOT NULL DEFAULT 'direct',
  requirement_id CHAR(36),
  connection_id CHAR(36),
  created_by_legacy_member_id BIGINT NOT NULL,
  metadata LONGTEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(metadata)),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_conv_type CHECK (
    type IN ('direct', 'requirement', 'connection')
  ),
  CONSTRAINT fk_b4bc_conv_requirement
    FOREIGN KEY (requirement_id)
    REFERENCES b4bc_app_requirements(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_b4bc_conv_connection
    FOREIGN KEY (connection_id)
    REFERENCES b4bc_app_partner_connections(id)
    ON DELETE SET NULL,
  KEY idx_b4bc_conv_requirement (requirement_id),
  KEY idx_b4bc_conv_connection (connection_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_messages (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  conversation_id CHAR(36) NOT NULL,
  sender_legacy_member_id BIGINT NOT NULL,
  body TEXT,
  message_type VARCHAR(40) NOT NULL DEFAULT 'text',
  metadata LONGTEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(metadata)),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_msg_type CHECK (
    message_type IN ('text', 'system', 'attachment')
  ),
  CONSTRAINT chk_b4bc_msg_body_or_non_text CHECK (
    message_type <> 'text'
    OR CHAR_LENGTH(TRIM(COALESCE(body, ''))) > 0
  ),
  CONSTRAINT fk_b4bc_msg_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES b4bc_app_conversations(id)
    ON DELETE CASCADE,
  KEY idx_b4bc_msg_conversation_created (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_conversation_participants (
  conversation_id CHAR(36) NOT NULL,
  legacy_member_id BIGINT NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'member',
  last_read_message_id CHAR(36),
  muted_until TIMESTAMP NULL DEFAULT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (conversation_id, legacy_member_id),
  CONSTRAINT chk_b4bc_conv_part_role CHECK (
    role IN ('member', 'admin')
  ),
  CONSTRAINT fk_b4bc_conv_part_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES b4bc_app_conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_b4bc_conv_part_last_read
    FOREIGN KEY (last_read_message_id)
    REFERENCES b4bc_app_messages(id)
    ON DELETE SET NULL,
  KEY idx_b4bc_conv_part_member_joined (legacy_member_id, joined_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_message_attachments (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  message_id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(120),
  file_size_bytes BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_msg_att_name CHECK (CHAR_LENGTH(TRIM(file_name)) > 0),
  CONSTRAINT chk_b4bc_msg_att_url CHECK (CHAR_LENGTH(TRIM(file_url)) > 0),
  CONSTRAINT chk_b4bc_msg_att_size CHECK (
    file_size_bytes IS NULL
    OR file_size_bytes >= 0
  ),
  CONSTRAINT fk_b4bc_msg_att_message
    FOREIGN KEY (message_id)
    REFERENCES b4bc_app_messages(id)
    ON DELETE CASCADE,
  KEY idx_b4bc_msg_att_message (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_notifications (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  legacy_member_id BIGINT NOT NULL,
  type VARCHAR(80) NOT NULL,
  actor_legacy_member_id BIGINT,
  requirement_id CHAR(36),
  conversation_id CHAR(36),
  message_id CHAR(36),
  payload LONGTEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(payload)),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_notif_type CHECK (CHAR_LENGTH(TRIM(type)) > 0),
  CONSTRAINT chk_b4bc_notif_read_at CHECK (
    is_read = FALSE
    OR read_at IS NOT NULL
  ),
  CONSTRAINT fk_b4bc_notif_requirement
    FOREIGN KEY (requirement_id)
    REFERENCES b4bc_app_requirements(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_b4bc_notif_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES b4bc_app_conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_b4bc_notif_message
    FOREIGN KEY (message_id)
    REFERENCES b4bc_app_messages(id)
    ON DELETE CASCADE,
  KEY idx_b4bc_notif_member_unread (legacy_member_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS b4bc_app_network_activity_events (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  event_type VARCHAR(80) NOT NULL,
  visibility VARCHAR(40) NOT NULL DEFAULT 'network',
  actor_legacy_member_id BIGINT,
  related_legacy_member_id BIGINT,
  requirement_id CHAR(36),
  requirement_response_id CHAR(36),
  partner_connection_id CHAR(36),
  conversation_id CHAR(36),
  message_id CHAR(36),
  notification_id CHAR(36),
  source_table VARCHAR(120) NOT NULL,
  source_id VARCHAR(191) NOT NULL,
  payload LONGTEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(payload)),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_b4bc_act_type CHECK (CHAR_LENGTH(TRIM(event_type)) > 0),
  CONSTRAINT chk_b4bc_act_visibility CHECK (
    visibility IN ('network', 'member', 'private')
  ),
  CONSTRAINT chk_b4bc_act_source_table CHECK (CHAR_LENGTH(TRIM(source_table)) > 0),
  CONSTRAINT chk_b4bc_act_source_id CHECK (CHAR_LENGTH(TRIM(source_id)) > 0),
  CONSTRAINT fk_b4bc_act_requirement
    FOREIGN KEY (requirement_id)
    REFERENCES b4bc_app_requirements(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_b4bc_act_req_response
    FOREIGN KEY (requirement_response_id)
    REFERENCES b4bc_app_requirement_responses(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_b4bc_act_connection
    FOREIGN KEY (partner_connection_id)
    REFERENCES b4bc_app_partner_connections(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_b4bc_act_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES b4bc_app_conversations(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_b4bc_act_message
    FOREIGN KEY (message_id)
    REFERENCES b4bc_app_messages(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_b4bc_act_notification
    FOREIGN KEY (notification_id)
    REFERENCES b4bc_app_notifications(id)
    ON DELETE SET NULL,
  UNIQUE KEY uq_b4bc_act_source_event_visibility (
    source_table,
    source_id,
    event_type,
    visibility
  ),
  KEY idx_b4bc_act_visibility_created (visibility, created_at),
  KEY idx_b4bc_act_actor_created (actor_legacy_member_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
