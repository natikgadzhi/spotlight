import { useState } from 'react';
import { Link, Outlet, Route, Routes, useParams } from 'react-router-dom';
import Tabs from '../../../components/Tabs';
import sentryDataCache from '../data/sentryDataCache';
import { SentryEvent } from '../types';
import EventBreadcrumbs from './EventBreadcrumbs';
import EventContexts from './EventContexts';
import Error, { ErrorTitle } from './Events/Error';
import PlatformIcon from './PlatformIcon';

function renderEvent(event: SentryEvent) {
  if ('exception' in event) return <Error event={event} />;
  return null;
}

function renderEventTitle(event: SentryEvent) {
  if ('exception' in event) return <ErrorTitle event={event} />;
  return 'Unknown Event';
}

export default function EventDetails() {
  const { eventId } = useParams();
  const [activeTab, setActiveTab] = useState('details');

  if (!eventId) {
    return <p>Unknown event id</p>;
  }

  const event = sentryDataCache.getEventById(eventId);

  if (!event) {
    return <p>Event not found</p>;
  }

  const tabs = [
    {
      id: 'details',
      title: 'Details',
      active: activeTab === 'details',
      onSelect: () => setActiveTab('details'),
    },
    {
      id: 'breadcrumbs',
      title: 'Breadcrumbs',
      active: activeTab === 'breadcrumbs',
      onSelect: () => setActiveTab('breadcrumbs'),
    },
    {
      id: 'contexts',
      title: 'Context',
      active: activeTab === 'contexts',
      onSelect: () => setActiveTab('contexts'),
    },
  ];

  const traceCtx = event.contexts?.trace;
  return (
    <>
      <div className="flex items-center gap-x-2 bg-indigo-950 px-6 py-4">
        <PlatformIcon event={event} />
        <h1 className="max-w-full flex-1 truncate text-2xl">{renderEventTitle(event)}</h1>
        {!!traceCtx && (
          <div className="font-mono text-indigo-300">
            <div>
              T:{' '}
              <Link className="cursor-pointer underline" to={`/traces/${traceCtx.trace_id}`}>
                {traceCtx.trace_id}
              </Link>
            </div>
            <div>
              S:{' '}
              <Link className="cursor-pointer underline" to={`/traces/${traceCtx.trace_id}/${traceCtx.span_id}`}>
                {traceCtx.span_id}
              </Link>
            </div>
          </div>
        )}
      </div>
      <Tabs tabs={tabs} nested={true} />
      <div className="flex-1 px-6 py-4">
        <Routes>
          <Route path="breadcrumbs" element={<EventBreadcrumbs event={event} />} />
          <Route path="contexts" element={<EventContexts event={event} />} />
          {/* Default tab */}
          <Route path="*" element={renderEvent(event)} />
        </Routes>
        <Outlet />
      </div>
    </>
  );
}
