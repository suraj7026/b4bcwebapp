DROP TABLE IF EXISTS b4bc_app.notifications;
DROP TABLE IF EXISTS b4bc_app.message_attachments;

ALTER TABLE IF EXISTS b4bc_app.conversation_participants
  DROP CONSTRAINT IF EXISTS conversation_participants_last_read_message_id_fkey;

DROP TABLE IF EXISTS b4bc_app.messages;
DROP TABLE IF EXISTS b4bc_app.conversation_participants;
DROP TABLE IF EXISTS b4bc_app.conversations;
DROP TABLE IF EXISTS b4bc_app.partner_connections;
DROP TABLE IF EXISTS b4bc_app.saved_partners;
DROP TABLE IF EXISTS b4bc_app.feed_reactions;
DROP TABLE IF EXISTS b4bc_app.requirement_comments;
DROP TABLE IF EXISTS b4bc_app.requirement_responses;
DROP TABLE IF EXISTS b4bc_app.requirement_attachments;
DROP TABLE IF EXISTS b4bc_app.requirement_tags;
DROP TABLE IF EXISTS b4bc_app.requirements;
DROP TABLE IF EXISTS b4bc_app.member_preferences;
DROP TABLE IF EXISTS b4bc_app.member_profiles;
DROP FUNCTION IF EXISTS b4bc_app.set_updated_at();
DROP SCHEMA IF EXISTS b4bc_app;
