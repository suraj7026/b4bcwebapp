import { Button } from "@/components/ui/button";
import { Card, CardBody, Chip } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { fetchFeedRequirementsAction } from "@/app/actions/app-queries";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const requirements = await fetchFeedRequirementsAction();

  return (
    <main className="mx-auto max-w-[1120px] px-5 py-8 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-outline">
            Public Feed
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-on-surface">
            Requirements from B4BC members
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Members can post needs, discover opportunities, and start
            conversations with relevant partners.
          </p>
        </div>
        <Button>
          <Icon name="add" />
          Post Requirement
        </Button>
      </header>

      <section className="mb-5 flex flex-wrap gap-2 rounded-xl border border-border-subtle bg-surface-container-lowest p-3 shadow-card">
        <Button variant="outline" size="sm">
          <Icon name="search" />
          Industry: All
        </Button>
        <Button variant="outline" size="sm">
          Recent
          <Icon name="expand_more" />
        </Button>
        <Button variant="ghost" size="sm">
          Reset Filters
        </Button>
      </section>

      <section className="space-y-4">
        {requirements.length === 0 ? (
          <Card>
            <CardBody>
              <p className="text-sm text-on-surface-variant">
                No requirements have been posted yet.
              </p>
            </CardBody>
          </Card>
        ) : null}

        {requirements.map((item) => (
          <Card key={item.id}>
            <CardBody>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-full bg-primary-fixed text-sm font-bold text-primary">
                    {item.author[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">
                      {item.author}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {item.role} • {item.time}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" aria-label="More actions">
                  <Icon name="expand_more" />
                </Button>
              </div>

              <div className="mt-5">
                <h2 className="text-xl font-semibold text-on-surface">
                  {item.title}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
                  {item.body}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Chip key={tag}>#{tag}</Chip>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
                <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="trending_up" /> {item.likes}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="chat" /> {item.comments}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    Chat
                  </Button>
                  <Button size="sm">Message to Help</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </section>
    </main>
  );
}
