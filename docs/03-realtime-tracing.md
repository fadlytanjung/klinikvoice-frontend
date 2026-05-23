# 03 — Real-Time Tracing `[DEFERRED]`

> **Status (M3):** Not buildable. The backend SSE endpoint
> (`conversations/{id}/stream`) does not exist yet, and the core product is the
> voice call rather than chat tracing. This doc is the forward design; do not
> implement until the backend ships the stream. Tracked in doc 02 §6.
>
> Cross-ref: docs/14-observability-and-monitoring.md

## 1. SSE Endpoint (backend) `[SPEC]`

```
GET /api/v1/streams/conversations/{conversation_id}
```

Streams newline-delimited JSON events:

```json
{"type": "agent.state_change", "state": "Book", "at": "2026-05-01T10:00:01Z"}
{"type": "agent.tool_call", "tool": "find_slots", "input": {...}, "at": "..."}
{"type": "agent.tool_result", "tool": "find_slots", "output": {...}, "at": "..."}
{"type": "agent.llm_call", "model": "gpt-4o-mini", "prompt_version": "1.0", "at": "..."}
{"type": "agent.handoff", "reason": "patient_request", "at": "..."}
{"type": "conversation.closed", "at": "..."}
```

## 2. useConversationStream Hook `[SPEC]`

```typescript
// src/hooks/use-conversation-stream.ts
import { useEffect, useRef, useState } from 'react';

export type StreamEvent = {
  type: string;
  [key: string]: unknown;
};

export function useConversationStream(conversationId: string | null) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const retryCount = { current: 0 };

    const connect = () => {
      const es = new EventSource(`/api/v1/streams/conversations/${conversationId}`);
      esRef.current = es;

      es.onopen = () => setConnected(true);
      es.onmessage = (e) => {
        const event = JSON.parse(e.data) as StreamEvent;
        setEvents((prev) => [...prev, event]);
        if (event.type === 'conversation.closed') es.close();
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        // Exponential backoff reconnect
        setTimeout(connect, Math.min(1000 * 2 ** retryCount.current, 30000));
        retryCount.current++;
      };
    };

    connect();
    return () => esRef.current?.close();
  }, [conversationId]);

  return { events, connected };
}
```

## 3. Live Call Panel Component `[SPEC]`

```typescript
// src/components/features/LiveCallPanel.tsx
import { useConversationStream } from '@/hooks/use-conversation-stream';
import { Badge } from '@/components/ui/badge';

interface Props {
  conversationId: string;
}

export function LiveCallPanel({ conversationId }: Props) {
  const { events, connected } = useConversationStream(conversationId);

  const lastState = [...events].reverse().find(e => e.type === 'agent.state_change');
  const lastTool = [...events].reverse().find(e => e.type === 'agent.tool_call');

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-sm font-medium">
          {connected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      {lastState && (
        <div>
          <p className="text-xs text-muted-foreground">Agent state</p>
          <Badge variant="outline">{String(lastState.state)}</Badge>
        </div>
      )}

      {lastTool && (
        <div>
          <p className="text-xs text-muted-foreground">Last tool</p>
          <code className="text-xs">{String(lastTool.tool)}</code>
        </div>
      )}

      <div className="max-h-48 overflow-y-auto space-y-1">
        {events.map((e, i) => (
          <div key={i} className="text-xs font-mono text-muted-foreground">
            {e.type}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 4. Call Detail Page — Agent Trace Viewer `[SPEC]`

After a call ends, fetch the LangSmith trace summary from the backend:

```
GET /api/v1/calls/{call_id}/trace
```

Returns:
```json
{
  "langsmith_run_id": "...",
  "turns": [
    {
      "turn": 1,
      "state": "Greet",
      "intent": "book",
      "confidence": 0.92,
      "model": "gpt-4o-mini",
      "prompt_version": "1.0",
      "tools_called": ["find_slots"],
      "latency_ms": 620
    }
  ],
  "booking_outcome": "created",
  "handoff": false,
  "total_cost_usd": 0.0023
}
```

Render as a collapsible timeline on the call detail page.
