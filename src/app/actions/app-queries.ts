"use server";

import { revalidatePath } from "next/cache";
import { query as mysqlQuery, type QueryParam } from "@/lib/mysql";
import { fetchPartnerRecommendationsForRequirement } from "@/lib/member-matching";
import { getPostgresPool, pgQuery, pgQueryOne } from "@/lib/postgres";
import { readSession } from "@/lib/session";
import type { PartnerRecommendation } from "@/types/database";

interface MemberSummary {
  id: number;
  displayName: string;
  role: string;
  companyName: string | null;
}

export interface FeedRequirement {
  id: string;
  author: string;
  role: string;
  time: string;
  title: string;
  body: string;
  tags: string[];
  likes: number;
  comments: number;
}

export interface ConversationSummary {
  id: string;
  name: string;
  preview: string;
  time: string;
  active: boolean;
}

export interface ThreadMessage {
  id: string;
  from: string;
  text: string;
  time: string;
  side: "left" | "right";
}

export interface MessagesSnapshot {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  activeName: string | null;
  activeSubtitle: string | null;
  thread: ThreadMessage[];
}

export interface MemberSettingsSnapshot {
  profileCompletion: number | null;
  notificationOptions: Array<{
    label: string;
    enabled: boolean;
  }>;
}

export interface HeaderActivityCounts {
  unreadNotifications: number;
  unreadMessages: number;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  time: string;
  isRead: boolean;
}

export interface NetworkActivityItem {
  id: string;
  type: string;
  actorName: string | null;
  actorInitial: string;
  summary: string;
  time: string;
  iconName: string | null;
  tone: "primary" | "tertiary" | "secondary";
}

export interface DashboardHomeSnapshot {
  activeRequirements: number;
  partnerRequests: number;
  networkActivity: NetworkActivityItem[];
}

export interface CreateRequirementResult {
  ok: boolean;
  error?: string;
  requirementId?: string;
  recommendations?: PartnerRecommendation[];
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function relativeTime(value: Date | string): string {
  const date = toDate(value);
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absMs < 60_000) return "Just now";
  if (absMs < 3_600_000) {
    return rtf.format(Math.round(diffMs / 60_000), "minute");
  }
  if (absMs < 86_400_000) {
    return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  }
  if (absMs < 604_800_000) {
    return rtf.format(Math.round(diffMs / 86_400_000), "day");
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function conversationTime(value: Date | string | null): string {
  if (!value) return "";
  const date = toDate(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return new Intl.DateTimeFormat("en", { weekday: "long" }).format(date);
}

function humanizeType(type: string): string {
  return type
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function payloadString(
  payload: Record<string, unknown> | null,
  key: string
): string | null {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function fetchMemberSummaries(
  memberIds: number[]
): Promise<Map<number, MemberSummary>> {
  const uniqueIds = Array.from(new Set(memberIds.filter(Number.isFinite)));
  if (!uniqueIds.length) return new Map();

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const rows = await mysqlQuery<{
    id: number;
    display_name: string | null;
    company_name: string | null;
    role: string | null;
  }>(
    `SELECT
       m.member_id AS id,
       COALESCE(NULLIF(m.member_name,''), NULLIF(m.company,''), m.email_address) AS display_name,
       NULLIF(m.company,'') AS company_name,
       COALESCE(NULLIF(m.service_provided,''), NULLIF(m.business_area,''), NULLIF(m.company,'')) AS role
     FROM b4b_members m
     WHERE m.member_id IN (${placeholders})`,
    uniqueIds as QueryParam[]
  );

  return new Map(
    rows.map((row) => [
      Number(row.id),
      {
        id: Number(row.id),
        displayName: row.display_name ?? `Member ${row.id}`,
        companyName: row.company_name,
        role: row.role ?? "B4BC Member",
      },
    ])
  );
}

export async function fetchNetworkActivityAction(input: {
  limit?: number;
} = {}): Promise<NetworkActivityItem[]> {
  const limit = Math.min(Math.max(input.limit ?? 4, 1), 10);
  const rows = await pgQuery<{
    id: string;
    event_type: string;
    actor_legacy_member_id: number | null;
    related_legacy_member_id: number | null;
    payload: Record<string, unknown> | null;
    created_at: Date;
  }>(
    `SELECT
       id::text,
       event_type,
       actor_legacy_member_id::int,
       related_legacy_member_id::int,
       payload,
       created_at
     FROM b4bc_app.network_activity_events
     WHERE visibility = 'network'
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );

  const memberIds = rows.flatMap((row) =>
    [row.actor_legacy_member_id, row.related_legacy_member_id]
      .filter((id): id is number => id != null)
      .map(Number)
  );
  const members = await fetchMemberSummaries(memberIds);

  return rows.map((row) => {
    const actor =
      row.actor_legacy_member_id == null
        ? null
        : members.get(Number(row.actor_legacy_member_id));
    const related =
      row.related_legacy_member_id == null
        ? null
        : members.get(Number(row.related_legacy_member_id));
    const requirementTitle =
      payloadString(row.payload, "requirementTitle") ?? "a requirement";
    const actorName = actor?.displayName ?? null;
    const relatedName = related?.displayName ?? null;

    if (row.event_type === "requirement_posted") {
      return {
        id: row.id,
        type: row.event_type,
        actorName,
        actorInitial: (actorName?.[0] ?? "B").toUpperCase(),
        summary: `requested ${requirementTitle}`,
        time: relativeTime(row.created_at),
        iconName: null,
        tone: "primary",
      };
    }

    if (row.event_type === "partner_connected") {
      return {
        id: row.id,
        type: row.event_type,
        actorName,
        actorInitial: (actorName?.[0] ?? "B").toUpperCase(),
        summary: `connected with ${relatedName ?? "a member"}`,
        time: relativeTime(row.created_at),
        iconName: "handshake",
        tone: "tertiary",
      };
    }

    const label =
      payloadString(row.payload, "label") ??
      payloadString(row.payload, "title") ??
      humanizeType(row.event_type);
    return {
      id: row.id,
      type: row.event_type,
      actorName,
      actorInitial: (actorName?.[0] ?? "B").toUpperCase(),
      summary: label,
      time: relativeTime(row.created_at),
      iconName: "notifications",
      tone: "secondary",
    };
  });
}

export async function fetchDashboardHomeAction(): Promise<DashboardHomeSnapshot> {
  const session = await readSession();
  if (!session) {
    return {
      activeRequirements: 0,
      partnerRequests: 0,
      networkActivity: [],
    };
  }

  const [
    activeRequirementRows,
    partnerRequestRows,
    networkActivity,
  ] = await Promise.all([
    pgQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM b4bc_app.requirements
       WHERE legacy_member_id = $1
         AND status IN ('open', 'matched')
         AND visibility = 'members'`,
      [session.memberId]
    ),
    pgQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM b4bc_app.partner_connections
       WHERE receiver_legacy_member_id = $1
         AND status = 'pending'`,
      [session.memberId]
    ),
    fetchNetworkActivityAction({ limit: 4 }),
  ]);

  return {
    activeRequirements: Number(activeRequirementRows[0]?.count ?? 0),
    partnerRequests: Number(partnerRequestRows[0]?.count ?? 0),
    networkActivity,
  };
}

export async function fetchFeedRequirementsAction(): Promise<
  FeedRequirement[]
> {
  const rows = await pgQuery<{
    id: string;
    legacy_member_id: number;
    title: string;
    body: string;
    created_at: Date;
    tags: string[];
    likes: number;
    comments: number;
  }>(
    `WITH reaction_counts AS (
       SELECT requirement_id, COUNT(*)::int AS likes
       FROM b4bc_app.feed_reactions
       GROUP BY requirement_id
     ),
     comment_counts AS (
       SELECT requirement_id, COUNT(*)::int AS comments
       FROM b4bc_app.requirement_comments
       WHERE deleted_at IS NULL
       GROUP BY requirement_id
     )
     SELECT
       r.id::text,
       r.legacy_member_id::int,
       r.title,
       r.body,
       r.created_at,
       COALESCE(
         jsonb_agg(t.tag ORDER BY t.tag) FILTER (WHERE t.tag IS NOT NULL),
         '[]'::jsonb
       ) AS tags,
       COALESCE(rc.likes, 0)::int AS likes,
       COALESCE(cc.comments, 0)::int AS comments
     FROM b4bc_app.requirements r
     LEFT JOIN b4bc_app.requirement_tags t ON t.requirement_id = r.id
     LEFT JOIN reaction_counts rc ON rc.requirement_id = r.id
     LEFT JOIN comment_counts cc ON cc.requirement_id = r.id
     WHERE r.visibility = 'members'
       AND r.status IN ('open', 'matched')
     GROUP BY r.id, rc.likes, cc.comments
     ORDER BY r.created_at DESC
     LIMIT 20`
  );

  const members = await fetchMemberSummaries(
    rows.map((row) => Number(row.legacy_member_id))
  );

  return rows.map((row) => {
    const member = members.get(Number(row.legacy_member_id));
    return {
      id: row.id,
      author: member?.displayName ?? `Member ${row.legacy_member_id}`,
      role: member?.role ?? "B4BC Member",
      time: relativeTime(row.created_at),
      title: row.title,
      body: row.body,
      tags: row.tags,
      likes: Number(row.likes),
      comments: Number(row.comments),
    };
  });
}

export async function fetchHeaderActivityCountsAction(): Promise<HeaderActivityCounts> {
  const session = await readSession();
  if (!session) {
    return {
      unreadNotifications: 0,
      unreadMessages: 0,
    };
  }

  const [notificationRows, messageRows] = await Promise.all([
    pgQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM b4bc_app.notifications
       WHERE legacy_member_id = $1
         AND is_read = false`,
      [session.memberId]
    ),
    pgQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM b4bc_app.messages m
       JOIN b4bc_app.conversation_participants p
         ON p.conversation_id = m.conversation_id
        AND p.legacy_member_id = $1
        AND p.left_at IS NULL
       LEFT JOIN b4bc_app.messages last_read
         ON last_read.id = p.last_read_message_id
       WHERE m.sender_legacy_member_id <> $1
         AND m.deleted_at IS NULL
         AND (
           p.last_read_message_id IS NULL
           OR m.created_at > last_read.created_at
         )`,
      [session.memberId]
    ),
  ]);

  return {
    unreadNotifications: Number(notificationRows[0]?.count ?? 0),
    unreadMessages: Number(messageRows[0]?.count ?? 0),
  };
}

export async function fetchNotificationsAction(): Promise<AppNotification[]> {
  const session = await readSession();
  if (!session) return [];

  const rows = await pgQuery<{
    id: string;
    type: string;
    actor_legacy_member_id: number | null;
    payload: Record<string, unknown> | null;
    is_read: boolean;
    created_at: Date;
  }>(
    `SELECT
       id::text,
       type,
       actor_legacy_member_id::int,
       payload,
       is_read,
       created_at
     FROM b4bc_app.notifications
     WHERE legacy_member_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [session.memberId]
  );

  const actors = await fetchMemberSummaries(
    rows
      .map((row) => row.actor_legacy_member_id)
      .filter((id): id is number => id != null)
      .map((id) => Number(id))
      .filter(Number.isFinite)
  );

  return rows.map((row) => {
    const payload = row.payload ?? {};
    const actor =
      row.actor_legacy_member_id == null
        ? null
        : actors.get(Number(row.actor_legacy_member_id));
    const title =
      typeof payload.label === "string"
        ? payload.label
        : typeof payload.title === "string"
        ? payload.title
        : humanizeType(row.type);
    const body =
      typeof payload.body === "string"
        ? payload.body
        : actor
        ? `From ${actor.displayName}`
        : null;

    return {
      id: row.id,
      type: row.type,
      title,
      body,
      time: relativeTime(row.created_at),
      isRead: row.is_read,
    };
  });
}

async function loadConversationRows(memberId: number) {
  return pgQuery<{
    id: string;
    type: string;
    created_by_legacy_member_id: number;
    preview: string | null;
    latest_at: Date | null;
  }>(
    `SELECT
       c.id::text,
       c.type,
       c.created_by_legacy_member_id::int,
       latest.body AS preview,
       latest.created_at AS latest_at
     FROM b4bc_app.conversations c
     LEFT JOIN LATERAL (
       SELECT m.body, m.created_at
       FROM b4bc_app.messages m
       WHERE m.conversation_id = c.id
         AND m.deleted_at IS NULL
       ORDER BY m.created_at DESC
       LIMIT 1
     ) latest ON true
     WHERE EXISTS (
       SELECT 1
       FROM b4bc_app.conversation_participants mine
       WHERE mine.conversation_id = c.id
         AND mine.legacy_member_id = $1
         AND mine.left_at IS NULL
     )
     ORDER BY COALESCE(latest.created_at, c.created_at) DESC
     LIMIT 20`,
    [memberId]
  );
}

function conversationDisplayName(
  participantIds: number[],
  members: Map<number, MemberSummary>,
  currentMemberId: number
): string {
  const others = participantIds.filter((id) => id !== currentMemberId);
  const visibleIds = others.length ? others : participantIds;
  const names = visibleIds
    .map((id) => members.get(id)?.displayName)
    .filter((name): name is string => Boolean(name));

  if (names.length === 0) return "Conversation";
  if (names.length === 1) return names[0];
  return `${names[0]} + ${names.length - 1}`;
}

export async function fetchMessagesSnapshotAction(
  conversationId?: string | null
): Promise<MessagesSnapshot> {
  const session = await readSession();
  if (!session) {
    return {
      conversations: [],
      activeConversationId: null,
      activeName: null,
      activeSubtitle: null,
      thread: [],
    };
  }

  const currentMemberId = session.memberId;
  const conversationRows = await loadConversationRows(currentMemberId);
  if (!conversationRows.length) {
    return {
      conversations: [],
      activeConversationId: null,
      activeName: null,
      activeSubtitle: null,
      thread: [],
    };
  }

  const conversationIds = conversationRows.map((row) => row.id);
  const participantRows = await pgQuery<{
    conversation_id: string;
    legacy_member_id: number;
  }>(
    `SELECT conversation_id::text, legacy_member_id::int
     FROM b4bc_app.conversation_participants
     WHERE conversation_id = ANY($1::uuid[])
       AND left_at IS NULL
     ORDER BY joined_at`,
    [conversationIds]
  );

  const allMemberIds = participantRows.map((row) => Number(row.legacy_member_id));
  const members = await fetchMemberSummaries(allMemberIds);

  const participantsByConversation = new Map<string, number[]>();
  for (const participant of participantRows) {
    const ids = participantsByConversation.get(participant.conversation_id) ?? [];
    ids.push(Number(participant.legacy_member_id));
    participantsByConversation.set(participant.conversation_id, ids);
  }

  const selectedConversation =
    conversationRows.find((row) => row.id === conversationId) ??
    conversationRows[0];

  const conversations = conversationRows.map((row) => {
    const participantIds = participantsByConversation.get(row.id) ?? [];
    return {
      id: row.id,
      name: conversationDisplayName(participantIds, members, currentMemberId),
      preview: row.preview ?? "No messages yet",
      time: conversationTime(row.latest_at),
      active: row.id === selectedConversation.id,
    };
  });

  const messageRows = await pgQuery<{
    id: string;
    sender_legacy_member_id: number;
    body: string | null;
    created_at: Date;
  }>(
    `SELECT id::text, sender_legacy_member_id::int, body, created_at
     FROM b4bc_app.messages
     WHERE conversation_id = $1::uuid
       AND deleted_at IS NULL
     ORDER BY created_at ASC
     LIMIT 100`,
    [selectedConversation.id]
  );

  const senderIds = messageRows.map((row) => Number(row.sender_legacy_member_id));
  const senderMembers = await fetchMemberSummaries(senderIds);

  const active = conversations.find(
    (conversation) => conversation.id === selectedConversation.id
  );
  const activeParticipants =
    participantsByConversation.get(selectedConversation.id) ?? [];

  return {
    conversations,
    activeConversationId: selectedConversation.id,
    activeName: active?.name ?? null,
    activeSubtitle:
      activeParticipants.length === 1
        ? "1 participant"
        : `${activeParticipants.length} participants`,
    thread: messageRows.map((row) => {
      const senderId = Number(row.sender_legacy_member_id);
      const sender = senderMembers.get(senderId);
      return {
        id: row.id,
        from: sender?.displayName ?? `Member ${senderId}`,
        text: row.body ?? "",
        time: conversationTime(row.created_at),
        side: senderId === currentMemberId ? "right" : "left",
      };
    }),
  };
}

export async function sendChatMessageAction(input: {
  conversationId: string;
  body: string;
}): Promise<{ ok: boolean; error?: string; snapshot?: MessagesSnapshot }> {
  const session = await readSession();
  if (!session) return { ok: false, error: "Sign in before messaging." };

  const body = input.body.trim();
  if (!body) return { ok: false, error: "Enter a message first." };
  if (body.length > 4000) {
    return { ok: false, error: "Message must be 4,000 characters or less." };
  }

  const inserted = await pgQueryOne<{ id: string }>(
    `WITH inserted AS (
       INSERT INTO b4bc_app.messages (
         conversation_id,
         sender_legacy_member_id,
         body,
         message_type
       )
       SELECT $1::uuid, $2::bigint, $3, 'text'
       WHERE EXISTS (
         SELECT 1
         FROM b4bc_app.conversation_participants
         WHERE conversation_id = $1::uuid
           AND legacy_member_id = $2::bigint
           AND left_at IS NULL
       )
       RETURNING id
     ),
     touched AS (
       UPDATE b4bc_app.conversations
       SET updated_at = now()
       WHERE id = $1::uuid
         AND EXISTS (SELECT 1 FROM inserted)
       RETURNING id
     )
     SELECT id::text FROM inserted`,
    [input.conversationId, session.memberId, body]
  );

  if (!inserted) {
    return { ok: false, error: "You are not part of this conversation." };
  }

  revalidatePath("/messages");
  return {
    ok: true,
    snapshot: await fetchMessagesSnapshotAction(input.conversationId),
  };
}

export async function startDirectConversationAction(input: {
  memberId: string | number;
}): Promise<{ ok: boolean; error?: string; conversationId?: string }> {
  const session = await readSession();
  if (!session) return { ok: false, error: "Sign in before messaging." };

  const targetMemberId = Number(input.memberId);
  if (!Number.isInteger(targetMemberId) || targetMemberId <= 0) {
    return { ok: false, error: "Invalid member." };
  }
  if (targetMemberId === session.memberId) {
    return { ok: false, error: "You cannot start a chat with yourself." };
  }

  const target = await mysqlQuery<{ member_id: number }>(
    `SELECT member_id
     FROM b4b_members m
     WHERE m.member_id = ?
       AND (m.date_of_exit IS NULL OR m.date_of_exit = '0000-00-00')
     LIMIT 1`,
    [targetMemberId]
  );
  if (!target.length) return { ok: false, error: "Member not found." };

  const existing = await pgQueryOne<{ id: string }>(
    `SELECT c.id::text
     FROM b4bc_app.conversations c
     JOIN b4bc_app.conversation_participants p1
       ON p1.conversation_id = c.id
      AND p1.legacy_member_id = $1::bigint
      AND p1.left_at IS NULL
     JOIN b4bc_app.conversation_participants p2
       ON p2.conversation_id = c.id
      AND p2.legacy_member_id = $2::bigint
      AND p2.left_at IS NULL
     WHERE c.type = 'direct'
     LIMIT 1`,
    [session.memberId, targetMemberId]
  );
  if (existing) return { ok: true, conversationId: existing.id };

  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const created = await client.query<{ id: string }>(
      `INSERT INTO b4bc_app.conversations (
         type,
         created_by_legacy_member_id
       )
       VALUES ('direct', $1)
       RETURNING id::text`,
      [session.memberId]
    );
    const conversationId = created.rows[0]?.id;
    if (!conversationId) throw new Error("Conversation creation failed.");

    await client.query(
      `INSERT INTO b4bc_app.conversation_participants (
         conversation_id,
         legacy_member_id,
         role
       )
       VALUES
         ($1::uuid, $2::bigint, 'member'),
         ($1::uuid, $3::bigint, 'member')`,
      [conversationId, session.memberId, targetMemberId]
    );

    await client.query("COMMIT");
    revalidatePath("/messages");
    return { ok: true, conversationId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function fetchMemberSettingsSnapshotAction(): Promise<MemberSettingsSnapshot> {
  const session = await readSession();
  if (!session) {
    return {
      profileCompletion: null,
      notificationOptions: [],
    };
  }

  const row = await pgQueryOne<{
    profile_completion: number | null;
    email_notifications: boolean | null;
    push_notifications: boolean | null;
    directory_visibility: string | null;
  }>(
    `SELECT
       mp.profile_completion,
       prefs.email_notifications,
       prefs.push_notifications,
       prefs.directory_visibility
     FROM (SELECT $1::bigint AS legacy_member_id) current_member
     LEFT JOIN b4bc_app.member_profiles mp
       ON mp.legacy_member_id = current_member.legacy_member_id
     LEFT JOIN b4bc_app.member_preferences prefs
       ON prefs.legacy_member_id = current_member.legacy_member_id`,
    [session.memberId]
  );

  if (!row) {
    return {
      profileCompletion: null,
      notificationOptions: [],
    };
  }

  const profileCompletion =
    row.profile_completion == null ? null : Number(row.profile_completion);
  const hasPreferences =
    row.push_notifications != null ||
    row.email_notifications != null ||
    row.directory_visibility != null;

  return {
    profileCompletion,
    notificationOptions: hasPreferences
      ? [
          {
            label: "New partner matches",
            enabled: row.push_notifications === true,
          },
          {
            label: "Replies to my requirements",
            enabled: row.email_notifications === true,
          },
          {
            label: "Profile views and engagement",
            enabled: row.directory_visibility === "members",
          },
        ]
      : [],
  };
}

export async function createRequirementAction(input: {
  body: string;
}): Promise<CreateRequirementResult> {
  const session = await readSession();
  if (!session) return { ok: false, error: "Sign in before posting." };

  const body = input.body.trim();
  if (!body) return { ok: false, error: "Enter a requirement first." };

  const title = body.length > 96 ? `${body.slice(0, 93)}...` : body;
  const client = await getPostgresPool().connect();
  let requirementId = "";

  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO b4bc_app.requirements (
         legacy_member_id,
         title,
         body,
         status,
         visibility
       )
       VALUES ($1, $2, $3, 'open', 'members')
       RETURNING id::text`,
      [session.memberId, title, body]
    );
    requirementId = inserted.rows[0]?.id ?? "";
    if (!requirementId) throw new Error("Requirement creation failed.");

    await client.query(
      `INSERT INTO b4bc_app.network_activity_events (
         event_type,
         visibility,
         actor_legacy_member_id,
         requirement_id,
         source_table,
         source_id,
         payload
       )
       VALUES (
         'requirement_posted',
         'network',
         $1::bigint,
         $2::uuid,
         'b4bc_app.requirements',
         $2::text,
         jsonb_build_object('requirementTitle', $3::text)
       )
       ON CONFLICT (source_table, source_id, event_type, visibility) DO NOTHING`,
      [session.memberId, requirementId, title]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  revalidatePath("/directory");
  revalidatePath("/feed");

  const recommendations = await fetchPartnerRecommendationsForRequirement(
    body,
    session.memberId,
    3
  );

  return { ok: true, requirementId, recommendations };
}
