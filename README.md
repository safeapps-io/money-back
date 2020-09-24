## WebSockets flow

Auth:

```mermaid
sequenceDiagram
  participant S as Server
  participant C as Client
  C-->S: Open wss://.../sync
  S->>C: Ready
  opt Old access token
    C->>S: Give me new token by refresh
    S->>C: Here you are: 18a42019e1…
  end

  Note over C: Set timer to get<br/>new access token<br/>before it expires
  C->>S: [all messages go with AT]
  Note over S: Validate Access <br/>Token
  Note over S: Pass to middleware<br/>if token is valid
  S->>C: [response]
```

Sync:

```mermaid
sequenceDiagram
  participant C2 as Client2
  participant S as Server
  participant C as Client1
  C-->C2: Authorized connection
  opt Initial
    C->>S: Timestamps of ents
    loop Send chunks
      S->>C: data
    end
    S->>C: End of initial
    Note over S: Subscribe Client to<br/>updates
  end
  
  loop Incremental
    C2->>S: data
    Note over S: Save to DB
    Note over S: Find all conns<br/>who are subscribed
    par Send
      S->>C: data
      S->>C2: data
    end
  end
```

Client states (I put it here to have it somehow in one place):

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Server
  note left of C: Default: <br/>CacheFetchedStore<br/>CFS = false<br/>---<br/>SyncStateStore<br/>SSS=INITIAL

  C-->S: Authorized connection

  note over C: Get ents cache
  note left of C: CFS = true<br/>SSS = RUNS
  C->>S: Send timestamps
  loop initial sync
    S->>C: Send all updates
  end
  S->>C: End
  note left of C: SSS = FINISHED

  loop Incremental
    opt Upward
      C->>S: Send data
      S->>C:Recieve data
    end
    opt Downward
      S->>C: Send data
      C->>S:Recieve data
    end
  end
```

## How to debug sockets

1. `yarn testEnvMigrate` — running migrations and applying all the seeds
2. install [`websocat`](https://github.com/vi/websocat)
3. `websocat ws://0.0.0.0:8080/ws/9dJFMZADdoYhJ8E2SUxC0KLW2qYW3EaOyv6/sync`

### Example objects

Returns a category and a transaction: 

```json
{"type": "clientChanges", "data": {}}
```

Returns nothing:

```json
{"type": "clientChanges", "data": {"latestUpdated": "2020-01-01T14:20:52.147Z"}}
```

Updates a category name:

```json
{"type": "clientChanges", "data": { "latestUpdated": "2020-01-01T14:20:52.147Z", "entities": [ { "type": "category", "ent": { "id": "EaIYQnjW5o-twjHhriSsF","title": "!!!!!!!! Test rename category !!!!!!!!!","color": "#123456","isIncome": false,"clientUpdated": "2025-01-01T14:20:52.147Z", "updated": "2019-01-01T14:20:52.147Z"}}]}}
```

Update is ignored:

```json
{"type": "clientChanges", "data": { "latestUpdated": "2020-01-01T14:20:52.147Z", "entities": [ { "type": "category", "ent": { "id": "EaIYQnjW5o-twjHhriSsF","title": "@@@@@@@ Test rename category @@@@@@@@@","color": "#123456","isIncome": false,"clientUpdated": "2010-01-01T14:20:52.147Z", "updated": "2019-01-01T14:20:52.147Z"}}]}}
```
