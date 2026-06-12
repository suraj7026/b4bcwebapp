"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  getPool,
  query as mysqlQuery,
  type QueryParam,
} from "@/lib/mysql";
import { fetchPartnerRecommendationsForRequirement } from "@/lib/member-matching";
import { readSession } from "@/lib/session";
import type { PartnerRecommendation } from "@/types/database";

interface MemberSummary {
  id: number;
  displayName: string;
  role: string;
  companyName: string | null;
}

interface CountRow {
  count: number | string | bigint;
}

interface NetworkActivityRow {
  id: string;
  event_type: string;
  actor_legacy_member_id: number | string | null;
  related_legacy_member_id: number | string | null;
  payload: unknown;
  created_at: Date | string;
}

interface ConversationRow {
  id: string;
  type: string;
  created_by_legacy_member_id: number | string;
  preview: string | null;
  latest_at: Date | string | null;
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

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function payloadString(payload: unknown, key: string): string | null {
  const value = parseJsonObject(payload)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dbBoolean(value: boolean | number | string | null | undefined): boolean {
  return value === true || value === 1 || value === "1";
}

function memberIdFromDb(value: number | string | null): number | null {
  if (value == null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function placeholders(values: readonly unknown[]): string {
  return values.map(() => "?").join(", ");
}

async function fetchMemberSummaries(
  memberIds: number[]
): Promise<Map<number, MemberSummary>> {
  const uniqueIds = Array.from(new Set(memberIds.filter(Number.isFinite)));
  if (!uniqueIds.length) return new Map();

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
     WHERE m.member_id IN (${placeholders(uniqueIds)})`,
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
  const rows = await mysqlQuery<NetworkActivityRow>(
    `SELECT
       id,
       event_type,
       actor_legacy_member_id,
       related_legacy_member_id,
       payload,
       created_at
     FROM b4bc_app_network_activity_events
     WHERE visibility = 'network'
     ORDER BY created_at DESC
     LIMIT ${limit}`
  );

  const memberIds = rows.flatMap((row) =>
    [row.actor_legacy_member_id, row.related_legacy_member_id]
      .map(memberIdFromDb)
      .filter((id): id is number => id != null)
  );
  const members = await fetchMemberSummaries(memberIds);

  return rows.map((row) => {
    const actorId = memberIdFromDb(row.actor_legacy_member_id);
    const relatedId = memberIdFromDb(row.related_legacy_member_id);
    const actor = actorId == null ? null : members.get(actorId);
    const related = relatedId == null ? null : members.get(relatedId);
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

  const [activeRequirementRows, partnerRequestRows, networkActivity] =
    await Promise.all([
      mysqlQuery<CountRow>(
        `SELECT COUNT(*) AS count
         FROM b4bc_app_requirements
         WHERE legacy_member_id = ?
           AND status IN ('open', 'matched')
           AND visibility = 'members'`,
        [session.memberId]
      ),
      mysqlQuery<CountRow>(
        `SELECT COUNT(*) AS count
         FROM b4bc_app_partner_connections
         WHERE receiver_legacy_member_id = ?
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
  const rows = await mysqlQuery<{
    id: string;
    legacy_member_id: number | string;
    title: string;
    body: string;
    created_at: Date | string;
    likes: number | string;
    comments: number | string;
  }>(
    `SELECT
       r.id,
       r.legacy_member_id,
       r.title,
       r.body,
       r.created_at,
       COALESCE(rc.likes, 0) AS likes,
       COALESCE(cc.comments, 0) AS comments
     FROM b4bc_app_requirements r
     LEFT JOIN (
       SELECT requirement_id, COUNT(*) AS likes
       FROM b4bc_app_feed_reactions
       GROUP BY requirement_id
     ) rc ON rc.requirement_id = r.id
     LEFT JOIN (
       SELECT requirement_id, COUNT(*) AS comments
       FROM b4bc_app_requirement_comments
       WHERE deleted_at IS NULL
       GROUP BY requirement_id
     ) cc ON cc.requirement_id = r.id
     WHERE r.visibility = 'members'
       AND r.status IN ('open', 'matched')
     ORDER BY r.created_at DESC
     LIMIT 20`
  );

  const requirementIds = rows.map((row) => row.id);
  const tagsByRequirement = new Map<string, string[]>();
  if (requirementIds.length) {
    const tagRows = await mysqlQuery<{
      requirement_id: string;
      tag: string;
    }>(
      `SELECT requirement_id, tag
       FROM b4bc_app_requirement_tags
       WHERE requirement_id IN (${placeholders(requirementIds)})
       ORDER BY tag`,
      requirementIds
    );
    for (const tagRow of tagRows) {
      const tags = tagsByRequirement.get(tagRow.requirement_id) ?? [];
      tags.push(tagRow.tag);
      tagsByRequirement.set(tagRow.requirement_id, tags);
    }
  }

  const members = await fetchMemberSummaries(
    rows.map((row) => Number(row.legacy_member_id))
  );

  return rows.map((row) => {
    const legacyMemberId = Number(row.legacy_member_id);
    const member = members.get(legacyMemberId);
    return {
      id: row.id,
      author: member?.displayName ?? `Member ${legacyMemberId}`,
      role: member?.role ?? "B4BC Member",
      time: relativeTime(row.created_at),
      title: row.title,
      body: row.body,
      tags: tagsByRequirement.get(row.id) ?? [],
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
    mysqlQuery<CountRow>(
      `SELECT COUNT(*) AS count
       FROM b4bc_app_notifications
       WHERE legacy_member_id = ?
         AND is_read = FALSE`,
      [session.memberId]
    ),
    mysqlQuery<CountRow>(
      `SELECT COUNT(*) AS count
       FROM b4bc_app_messages m
       JOIN b4bc_app_conversation_participants p
         ON p.conversation_id = m.conversation_id
        AND p.legacy_member_id = ?
        AND p.left_at IS NULL
       LEFT JOIN b4bc_app_messages last_read
         ON last_read.id = p.last_read_message_id
       WHERE m.sender_legacy_member_id <> ?
         AND m.deleted_at IS NULL
         AND (
           p.last_read_message_id IS NULL
           OR m.created_at > last_read.created_at
         )`,
      [session.memberId, session.memberId]
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

  const rows = await mysqlQuery<{
    id: string;
    type: string;
    actor_legacy_member_id: number | string | null;
    payload: unknown;
    is_read: boolean | number | string;
    created_at: Date | string;
  }>(
    `SELECT
       id,
       type,
       actor_legacy_member_id,
       payload,
       is_read,
       created_at
     FROM b4bc_app_notifications
     WHERE legacy_member_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [session.memberId]
  );

  const actors = await fetchMemberSummaries(
    rows
      .map((row) => memberIdFromDb(row.actor_legacy_member_id))
      .filter((id): id is number => id != null)
  );

  return rows.map((row) => {
    const payload = parseJsonObject(row.payload);
    const actorId = memberIdFromDb(row.actor_legacy_member_id);
    const actor = actorId == null ? null : actors.get(actorId);
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
      isRead: dbBoolean(row.is_read),
    };
  });
}

async function loadConversationRows(memberId: number): Promise<ConversationRow[]> {
  return mysqlQuery<ConversationRow>(
    `SELECT
       c.id,
       c.type,
       c.created_by_legacy_member_id,
       (
         SELECT m.body
         FROM b4bc_app_messages m
         WHERE m.conversation_id = c.id
           AND m.deleted_at IS NULL
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT 1
       ) AS preview,
       (
         SELECT m.created_at
         FROM b4bc_app_messages m
         WHERE m.conversation_id = c.id
           AND m.deleted_at IS NULL
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT 1
       ) AS latest_at
     FROM b4bc_app_conversations c
     WHERE EXISTS (
       SELECT 1
       FROM b4bc_app_conversation_participants mine
       WHERE mine.conversation_id = c.id
         AND mine.legacy_member_id = ?
         AND mine.left_at IS NULL
     )
     ORDER BY COALESCE(latest_at, c.created_at) DESC
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
  const participantRows = await mysqlQuery<{
    conversation_id: string;
    legacy_member_id: number | string;
  }>(
    `SELECT conversation_id, legacy_member_id
     FROM b4bc_app_conversation_participants
     WHERE conversation_id IN (${placeholders(conversationIds)})
       AND left_at IS NULL
     ORDER BY joined_at`,
    conversationIds
  );

  const allMemberIds = participantRows.map((row) =>
    Number(row.legacy_member_id)
  );
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

  const messageRows = await mysqlQuery<{
    id: string;
    sender_legacy_member_id: number | string;
    body: string | null;
    created_at: Date | string;
  }>(
    `SELECT id, sender_legacy_member_id, body, created_at
     FROM b4bc_app_messages
     WHERE conversation_id = ?
       AND deleted_at IS NULL
     ORDER BY created_at ASC
     LIMIT 100`,
    [selectedConversation.id]
  );

  const senderIds = messageRows.map((row) =>
    Number(row.sender_legacy_member_id)
  );
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

  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [participantResult] = await connection.execute(
      `SELECT 1
       FROM b4bc_app_conversation_participants
       WHERE conversation_id = ?
         AND legacy_member_id = ?
         AND left_at IS NULL
       LIMIT 1`,
      [input.conversationId, session.memberId]
    );
    const participantRows = participantResult as Array<{ "1": number }>;
    if (!participantRows.length) {
      await connection.rollback();
      return { ok: false, error: "You are not part of this conversation." };
    }

    const messageId = randomUUID();
    await connection.execute(
      `INSERT INTO b4bc_app_messages (
         id,
         conversation_id,
         sender_legacy_member_id,
         body,
         message_type
       )
       VALUES (?, ?, ?, ?, 'text')`,
      [messageId, input.conversationId, session.memberId, body]
    );
    await connection.execute(
      `UPDATE b4bc_app_conversations
       SET updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [input.conversationId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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

  const existing = await mysqlQuery<{ id: string }>(
    `SELECT c.id
     FROM b4bc_app_conversations c
     JOIN b4bc_app_conversation_participants p1
       ON p1.conversation_id = c.id
      AND p1.legacy_member_id = ?
      AND p1.left_at IS NULL
     JOIN b4bc_app_conversation_participants p2
       ON p2.conversation_id = c.id
      AND p2.legacy_member_id = ?
      AND p2.left_at IS NULL
     WHERE c.type = 'direct'
     LIMIT 1`,
    [session.memberId, targetMemberId]
  );
  if (existing[0]) return { ok: true, conversationId: existing[0].id };

  const conversationId = randomUUID();
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO b4bc_app_conversations (
         id,
         type,
         created_by_legacy_member_id
       )
       VALUES (?, 'direct', ?)`,
      [conversationId, session.memberId]
    );

    await connection.execute(
      `INSERT INTO b4bc_app_conversation_participants (
         conversation_id,
         legacy_member_id,
         role
       )
       VALUES
         (?, ?, 'member'),
         (?, ?, 'member')`,
      [conversationId, session.memberId, conversationId, targetMemberId]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  revalidatePath("/messages");
  return { ok: true, conversationId };
}

export async function fetchMemberSettingsSnapshotAction(): Promise<MemberSettingsSnapshot> {
  const session = await readSession();
  if (!session) {
    return {
      profileCompletion: null,
      notificationOptions: [],
    };
  }

  const rows = await mysqlQuery<{
    profile_completion: number | string | null;
    email_notifications: boolean | number | string | null;
    push_notifications: boolean | number | string | null;
    directory_visibility: string | null;
  }>(
    `SELECT
       mp.profile_completion,
       prefs.email_notifications,
       prefs.push_notifications,
       prefs.directory_visibility
     FROM (SELECT ? AS legacy_member_id) current_member
     LEFT JOIN b4bc_app_member_profiles mp
       ON mp.legacy_member_id = current_member.legacy_member_id
     LEFT JOIN b4bc_app_member_preferences prefs
       ON prefs.legacy_member_id = current_member.legacy_member_id`,
    [session.memberId]
  );
  const row = rows[0];

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
            enabled: dbBoolean(row.push_notifications),
          },
          {
            label: "Replies to my requirements",
            enabled: dbBoolean(row.email_notifications),
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
  const requirementId = randomUUID();
  const activityId = randomUUID();
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO b4bc_app_requirements (
         id,
         legacy_member_id,
         title,
         body,
         status,
         visibility
       )
       VALUES (?, ?, ?, ?, 'open', 'members')`,
      [requirementId, session.memberId, title, body]
    );

    await connection.execute(
      `INSERT INTO b4bc_app_network_activity_events (
         id,
         event_type,
         visibility,
         actor_legacy_member_id,
         requirement_id,
         source_table,
         source_id,
         payload
       )
       VALUES (
         ?,
         'requirement_posted',
         'network',
         ?,
         ?,
         'b4bc_app_requirements',
         ?,
         ?
       )`,
      [
        activityId,
        session.memberId,
        requirementId,
        requirementId,
        JSON.stringify({ requirementTitle: title }),
      ]
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
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
