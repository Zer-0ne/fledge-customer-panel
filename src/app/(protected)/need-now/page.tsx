'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Inbox, Plus, Send, Timer } from 'lucide-react';
import { myRequests, receivedResponses, sentResponses } from '@/lib/api/services/neednow';
import { NeedNowRequest, NeedNowResponse, NeedNowStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { NeedNowRequestCard } from '@/components/neednow/neednow-request-card';
import { NeedNowResponseRow } from '@/components/neednow/neednow-response-row';

type StatusTab = Extract<NeedNowStatus, 'ACTIVE' | 'DRAFT' | 'EXPIRED' | 'FULFILLED'>;
type ResponseTab = 'received' | 'sent';

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'FULFILLED', label: 'Fulfilled' },
];

export default function MyNeedNowPage() {
  const router = useRouter();
  const [requests, setRequests] = React.useState<NeedNowRequest[] | null>(null);
  const [responses, setResponses] = React.useState<{ received: NeedNowResponse[]; sent: NeedNowResponse[] }>({
    received: [],
    sent: [],
  });
  const [error, setError] = React.useState<string | null>(null);
  const [statusTab, setStatusTab] = React.useState<StatusTab>('ACTIVE');
  const [responseTab, setResponseTab] = React.useState<ResponseTab>('received');

  const load = React.useCallback(async () => {
    setError(null);
    try {
      const [mine, received, sent] = await Promise.all([
        myRequests(),
        receivedResponses(),
        sentResponses(),
      ]);
      setRequests(mine);
      setResponses({ received, sent });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your requirements');
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const visibleRequests = (requests ?? []).filter((request) =>
    statusTab === 'ACTIVE' ? request.status === 'ACTIVE' || request.status === 'PAUSED' : request.status === statusTab
  );
  const visibleResponses = responseTab === 'received' ? responses.received : responses.sent;

  const handleActionDone = React.useCallback(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-background py-8 pb-20 md:pb-8">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="rounded-xl text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold sm:text-3xl tracking-tight text-foreground flex items-center gap-2">
              <Timer className="size-6 text-primary" />
              My Need
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Your 24-hour housing requirements. Publish one and it stays live for 24 hours.
            </p>
          </div>
          <Link href="/need-now/new">
            <Button className="rounded-xl gap-2 font-semibold">
              <Plus className="size-4" />
              New requirement
            </Button>
          </Link>
        </div>

        {requests === null && !error && (
          <div className="space-y-4">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        )}

        {error && (
          <ErrorState
            title="Could not load your requirements"
            message={error}
            onRetry={() => void load()}
          />
        )}

        {requests !== null && !error && (
          <>
            {/* Status tabs */}
            <div
              className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/60 w-full overflow-x-auto"
              role="tablist"
              aria-label="Filter requirements by status"
            >
              {STATUS_TABS.map((tab) => {
                const count = requests.filter((request) =>
                  tab.value === 'ACTIVE' ? request.status === 'ACTIVE' || request.status === 'PAUSED' : request.status === tab.value
                ).length;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={statusTab === tab.value}
                    onClick={() => setStatusTab(tab.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                      statusTab === tab.value
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {visibleRequests.length > 0 ? (
              <div className="space-y-4">
                {visibleRequests.map((request) => (
                  <NeedNowRequestCard key={request.id} request={request} onChanged={handleActionDone} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Timer}
                title={emptyTitle(statusTab)}
                description={emptyDescription(statusTab)}
                actionLabel={statusTab === 'DRAFT' ? 'Create a requirement' : undefined}
                onAction={statusTab === 'DRAFT' ? () => router.push('/need-now/new') : undefined}
              />
            )}

            {/* Responses */}
            <div className="pt-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Responses
                </h2>
                <div className="flex items-center gap-2 p-1 rounded-xl bg-muted/60" role="tablist" aria-label="Filter responses by direction">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={responseTab === 'received'}
                    onClick={() => setResponseTab('received')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      responseTab === 'received'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Inbox className="size-3.5" />
                    Received
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-bold">
                      {responses.received.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={responseTab === 'sent'}
                    onClick={() => setResponseTab('sent')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      responseTab === 'sent'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Send className="size-3.5" />
                    Sent
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary font-bold">
                      {responses.sent.length}
                    </span>
                  </button>
                </div>
              </div>

              {visibleResponses.length > 0 ? (
                <div className="space-y-4">
                  {visibleResponses.map((response) => (
                    <NeedNowResponseRow key={response.id} response={response} onChanged={handleActionDone} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={responseTab === 'received' ? Inbox : Send}
                  title={responseTab === 'received' ? 'No responses received' : 'No responses sent'}
                  description={
                    responseTab === 'received'
                      ? 'When other students respond to your requirements, they will show up here.'
                      : 'When you offer a listing or join someone\u2019s search, it will show up here.'
                  }
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function emptyTitle(tab: StatusTab): string {
  switch (tab) {
    case 'ACTIVE':
      return 'No active requirements';
    case 'DRAFT':
      return 'No drafts';
    case 'EXPIRED':
      return 'No expired requirements';
    case 'FULFILLED':
      return 'No fulfilled requirements';
    default:
      return 'Nothing here yet';
  }
}

function emptyDescription(tab: StatusTab): string {
  switch (tab) {
    case 'ACTIVE':
      return 'Publish a requirement and it stays live for 24 hours so nearby students can respond.';
    case 'DRAFT':
      return 'Drafts let you prepare a requirement and publish it later.';
    case 'EXPIRED':
      return 'Expired requirements can be renewed for another 24 hours.';
    case 'FULFILLED':
      return 'Requirements you marked as fulfilled are archived here.';
    default:
      return '';
  }
}
