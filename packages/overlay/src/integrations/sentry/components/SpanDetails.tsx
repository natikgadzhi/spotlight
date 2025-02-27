import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format as formatSQL } from 'sql-formatter';
import SidePanel, { SidePanelHeader } from '~/components/SidePanel';
import dataCache from '../data/sentryDataCache';
import { SentryErrorEvent, Span, TraceContext } from '../types';
import { formatBytes } from '../utils/bytes';
import { getDuration } from '../utils/duration';
import DateTime from './DateTime';
import { ErrorTitle } from './Events/Error';
import SpanTree from './SpanTree';

function formatSpanDescription(desc: string) {
  if (desc.match(/^(SELECT|INSERT|UPDATE|DELETE|TRUNCATE|ALTER) /i)) {
    try {
      return formatSQL(desc.replace(/([\s,(])(%[a-z])([\s,)])/gim, '$1?$3'));
    } catch (err) {
      console.error(err);
    }
  }
  return desc;
}

function formatValue(name: string, value: unknown): ReactNode {
  if (typeof value === 'number') {
    if (name.indexOf('size') !== -1 || name.indexOf('length') !== -1) return formatBytes(value);
    return value.toLocaleString();
  }
  return value as ReactNode;
}

export default function SpanDetails({
  traceContext,
  span,
  startTimestamp,
  totalDuration,
}: {
  traceContext: TraceContext;
  span: Span;
  startTimestamp: number;
  totalDuration: number;
}) {
  const spanDuration = getDuration(span.start_timestamp, span.timestamp);

  const errors = dataCache.getEventsByTrace(span.trace_id).filter(e => e.type !== 'transaction');

  return (
    <SidePanel>
      <SidePanelHeader
        title="Span Details"
        subtitle={
          <>
            {span.op} <span className="text-indigo-500">&mdash;</span> {span.span_id}
          </>
        }
        backTo={`/traces/${span.trace_id}`}
      />

      <div className="space-y-6">
        <div>
          <div className="flex flex-col space-y-4">
            <div className="flex flex-1 items-center gap-x-1 text-indigo-300">
              <DateTime date={span.start_timestamp} />
              <span>&mdash;</span>
              <span>
                <strong>{getDuration(startTimestamp, span.start_timestamp)} ms</strong> into trace
              </span>
            </div>
            <div className="flex-1">
              <div className="relative h-8 border border-indigo-800 py-1">
                <div
                  className="absolute bottom-0 top-0 -m-0.5 flex w-full items-center bg-indigo-800 p-0.5"
                  style={{
                    left: `min(${((span.start_timestamp - startTimestamp) / totalDuration) * 100}%, 100% - 1px)`,
                    width: `max(1px, ${(spanDuration / totalDuration) * 100}%)`,
                  }}
                >
                  <span className="whitespace-nowrap">{spanDuration} ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {!!errors.length && (
          <div className="flex flex-col items-start">
            <h2 className="mb-2 font-bold uppercase">Related Errors</h2>
            {errors.map(event => (
              <Link key={event.event_id} className="cursor-pointer underline" to={`/errors/${event.event_id}`}>
                <ErrorTitle event={event as SentryErrorEvent} />
              </Link>
            ))}
          </div>
        )}

        <div>
          <h2 className="mb-2 font-bold uppercase">Description</h2>
          {span.description ? (
            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-indigo-300">
              {formatSpanDescription(span.description)}
            </pre>
          ) : (
            <div className="text-indigo-300">No description recorded for this span.</div>
          )}
        </div>

        {span.op === 'resource.img' && span.description?.indexOf('/') === 0 && (
          <div>
            <h2 className="mb-2 font-bold uppercase">Preview</h2>
            <a
              href={span.description}
              className="-m-2 inline-block max-w-sm cursor-pointer rounded border border-indigo-950 p-1 hover:border-indigo-700"
            >
              <img src={span.description} alt="preview" style={{ maxHeight: 300 }} />
            </a>
          </div>
        )}

        <div>
          <h2 className="mb-2 font-bold uppercase">Tags</h2>
          {span.tags && Object.keys(span.tags).length ? (
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(span.tags).map(([key, value]) => {
                  return (
                    <tr key={key}>
                      <th className="w-1/12 py-0.5 pr-4 text-left font-mono font-normal text-indigo-300">
                        <div className="w-full truncate">{key}</div>
                      </th>
                      <td className="py-0.5">
                        <pre className="whitespace-nowrap font-mono">{JSON.stringify(value, undefined, 2)}</pre>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-indigo-300">No tags recorded for this span.</div>
          )}
        </div>
        <div>
          <h2 className="mb-2 font-bold uppercase">Context</h2>
          <table className="w-full text-sm">
            <tbody>
              {[
                ['status', span.status || ''],
                ['trace', span.trace_id],
                ['span', span.span_id],
                [
                  'parent',
                  span.parent_span_id ? (
                    <Link className="underline" to={`/traces/${span.trace_id}/${span.parent_span_id}`}>
                      {span.parent_span_id}
                    </Link>
                  ) : (
                    ''
                  ),
                ],
                ['op', span.op],
              ].map(([key, value]) => {
                return (
                  <tr key={key as string}>
                    <th className="w-1/12 py-0.5 pr-4 text-left font-mono font-normal text-indigo-300">
                      <div className="w-full truncate">{key}</div>
                    </th>
                    <td className="py-0.5">
                      <pre className="whitespace-nowrap font-mono">{value}</pre>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {span.data && (
          <div>
            <h2 className="mb-2 font-bold uppercase">Data</h2>
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(span.data).map(([key, value]) => {
                  return (
                    <tr key={key}>
                      <th className="w-1/12 py-0.5 pr-4 text-left font-mono font-normal text-indigo-300">
                        <div className="w-full truncate">{key}</div>
                      </th>
                      <td className="py-0.5">
                        <pre className="whitespace-nowrap font-mono">{formatValue(key, value)}</pre>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!!span.children?.length && (
          <div>
            <h2 className="mb-2 font-bold uppercase">Sub-tree</h2>
            <SpanTree
              traceContext={traceContext}
              tree={span.children}
              startTimestamp={startTimestamp}
              totalDuration={totalDuration}
            />
          </div>
        )}
      </div>
    </SidePanel>
  );
}
