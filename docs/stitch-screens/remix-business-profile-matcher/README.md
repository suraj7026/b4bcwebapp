# Remix of Business Profile Matcher

Source Stitch project: `projects/6964521237019460479`

The HTML design artifacts from Stitch were downloaded into `html/` for local
reference. The project contains two generations of screens: earlier variants
with a smaller sidebar and newer unified variants. Use the unified variants as
the preferred source of truth.

## Screen Inventory

| Local file | Stitch title | Purpose |
| --- | --- | --- |
| `html/member-dashboard-updated-activity.html` | Member Dashboard - Updated Activity | Preferred dashboard shell with five-page navigation. |
| `html/member-dashboard-unified.html` | Member Dashboard - Unified | Dashboard variant with post requirement, partner matches, activity, profile tip. |
| `html/member-dashboard-post-requirements.html` | Member Dashboard - Post Requirements | Earlier dashboard/post requirement variant. |
| `html/member-dashboard-post-requirements-1280.html` | Member Dashboard - Post Requirements | 1280px earlier dashboard/post requirement variant. |
| `html/find-partners-business-directory.html` | Find Partners - Business Directory | Earlier partner directory layout. |
| `html/partner-directory-unified.html` | Partner Directory - Unified | Preferred partner directory layout. |
| `html/public-requirements-feed-unified.html` | Public Requirements Feed - Unified | Preferred public requirements feed layout. |
| `html/public-requirements-feed.html` | Public Requirements Feed | Earlier public feed variant. |
| `html/member-messaging-unified.html` | Member Messaging - Unified | Preferred messaging layout. |
| `html/member-messaging.html` | Member Messaging | Earlier messaging variant. |

## Unified Navigation

The designs converge on this route set:

- My Dashboard
- Public Feed
- Find Partners
- Messages
- Settings
- Post Requirement as a prominent action
- Help Center and Logout as lower-priority sidebar actions

For the current app, map these to:

- `/dashboard` -> My Dashboard
- `/directory` -> My Dashboard
- `/find-partners` -> Find Partners / Partner Directory
- `/profile` -> Profile or Settings, depending on the final IA
- New `/feed` -> Public Requirements Feed
- New `/messages` -> Member Messaging
- New post requirement flow, either inline on dashboard/feed or `/requirements/new`
- New `/settings` and `/help` can be simple placeholders first if needed

## Features Implied By The Designs

### Redesign Existing Features

- Replace the current top-bar shell with a desktop fixed sidebar and mobile
  bottom navigation.
- Restyle dashboard, directory, profile, cards, inputs, and buttons using the
  B4BC Stitch design tokens.
- Rename current directory UX toward "Find Partners" while preserving the
  existing searchable member directory behavior.
- Add a global search surface that can search partners and requirements.

### New Product Features

- Post Requirement: a member can describe a business need and submit it.
- Requirement attachments: "Add Documents" appears in the dashboard composer.
- Public Requirements Feed: list member requirements with filters, tags,
  like counts, comment counts, and "Message to Help" actions.
- Partner matching: show recommended partners with match percentages.
- Connect/bookmark actions for partner cards.
- Recent Network Activity: track requirement posts, profile views, matches,
  endorsements, and similar events.
- Messaging: conversations list, message thread, composer, send action, media
  attachment button, emoji/action button, call/video/info controls.
- Notifications and mail indicators in the app header.
- Profile optimization prompt and richer profile completion/visibility state.
- Subscription/plan affordance appears in some directory screens; decide
  whether this is real scope or remove it from the unified design.

### Backend/Data Work Needed

- Requirements table/model with member ownership, title/body, tags, industry,
  timestamps, and status.
- Requirement attachments table/model or storage integration.
- Requirement interactions: likes, comments, and share counters if retained.
- Partner match scoring, initially heuristic from industry/zone/search terms.
- Connections/bookmarks table/model if connect/bookmark actions need persistence.
- Messaging tables/models: conversations, participants, messages, read state.
- Activity feed events derived from requirement, match, view, endorsement, and
  messaging actions.
- Notification records and unread counters.

## Implementation Notes

The current application is MySQL-backed and only has `/dashboard`, `/directory`,
`/directory/[id]`, `/profile`, and `/login`. Implement the redesign in phases:

1. Apply the shared shell and visual system to existing pages.
2. Convert `/directory` into the unified Find Partners experience.
3. Add requirement posting and public feed.
4. Add messaging and notification persistence.
5. Add settings/help/profile-completion polish.
