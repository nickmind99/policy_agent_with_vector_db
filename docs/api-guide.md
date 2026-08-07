# API guide

Conventions shared by both operations. The full contract is in the
[API reference](../openapi.yaml).

## Base URL

The server listens on the port given by `PORT`, defaulting to `5000`:

```
http://localhost:5000
```

There is no deployed environment in this repository, and no path prefix or version segment. Routers
are mounted directly at `/kb` and `/agent`.

## Authentication

None. The API mounts no authentication or authorization middleware, and no endpoint reads a
credential from the request.

CORS is configured with `origin: "*"`, so any web origin can call the API from a browser.

Both properties are appropriate for local development and unsafe for a public deployment: anyone
who can reach the server can read the entire knowledge base through the agent and write to it
through the upload endpoint. Authentication, per-tenant namespaces, and a restricted CORS origin
are prerequisites for exposing this service beyond localhost.

The OpenAPI description states this explicitly with an empty root-level `security` requirement
rather than leaving it unspecified.

## Content types

| Operation | Request | Response |
| --- | --- | --- |
| `POST /kb/upload` | `multipart/form-data` | `application/json` |
| `POST /agent/chat` | `application/json` | `application/json` |

## Response envelope

Every response, successful or not, carries a boolean `ok`. Errors carry a human-readable `message`;
successes carry operation-specific fields instead.

```json
{ "ok": true, "namespace": "default", "totalChunks": 12, "sources": ["pricing.pdf"] }
```

```json
{ "ok": false, "message": "Message is required" }
```

Because `ok` is present on both, a client should branch on the HTTP status code or on `ok`, not on
the presence of a particular field.

## Errors

Three status codes are used.

| Status | Meaning |
| --- | --- |
| `200` | The request succeeded. |
| `400` | The request was rejected: invalid input, an unusable file, or a question the guard blocked. |
| `500` | An unhandled failure while parsing, embedding, calling a model, or writing to the database. |

### `POST /kb/upload`

| Message | Cause |
| --- | --- |
| `No file uploaded.Please upload a file before proceeding!` | No `file` field in the form. |
| `Unsupported or empty file` | The extension and MIME type match none of PDF, text, or Markdown, or the file parsed to nothing. |
| `File loaded but produced no usable chunks after splitting is done` | The file parsed, but splitting produced no chunks — an empty or whitespace-only document. |
| `Something went wrong while uploading the file` | `500`. Parsing, embedding, or the vector store write failed. |

### `POST /agent/chat`

| Message | Cause |
| --- | --- |
| `Message is required` | `message` is missing, empty, or whitespace only. This response has no `threadId`. |
| `Your question does not comply with our policy rules` | The injection guard classified the question as an attempt to override the agent's instructions. This response includes `threadId`. |
| `Some error occurred` | `500`. The agent run failed. |

Note the asymmetry: the validation error is returned before a thread is resolved, so it has no
`threadId`, while the guard rejection happens after and includes one. A blocked question is not
appended to the conversation history.

An answer the agent cannot ground is not an error. It returns `200` with
`"answer": "I don't know based on the available documentation."` and an empty `citations` array.

## Conversation threads

`POST /agent/chat` returns a `threadId` on every successful response. Send it back on the next
request to continue the conversation; omit it to start a new one.

```bash
# First turn — no threadId
curl -X POST http://localhost:5000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How much does the Pro plan cost?"}'
```

```bash
# Follow-up — the threadId from the previous response resolves "it"
curl -X POST http://localhost:5000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "And how many projects does it include?", "threadId": "V1StGXR8_Z5j"}'
```

An unknown `threadId` is not an error. A new thread is created and its identifier is returned, so a
client should always read `threadId` from the response rather than assume the one it sent was kept.

Only the last ten messages are passed to the model. In longer conversations, references to earlier
turns will not resolve.

Threads are never expired or deleted by the service.

## Namespaces

`POST /agent/chat` accepts an optional `namespace` that scopes retrieval, defaulting to `default`.
`POST /kb/upload` always writes to `default` and has no way to select another, so a request for any
other namespace retrieves nothing unless that namespace was populated outside the API.

## Rate limits

None. The service applies no rate limiting, throttling, or quota of its own, and returns no
`429` status or rate limit headers.

Upstream limits still apply. A single chat request makes at least four OpenAI calls — guard,
planner, synthesizer, and checker — plus one embedding call per sub-question, and up to three more
synthesizer and checker calls when drafts are rejected. Concurrent traffic can therefore reach the
OpenAI account's rate limits quickly. An upstream rejection surfaces to the client as a `500`,
except in the guard and checker, which are designed to fail open and let the request continue.

## Pagination

Not applicable. Neither operation returns a collection that can grow without bound.

`citations` and `plan` are bounded by the agent's configuration: at most four sub-questions, each
retrieving two chunks, so at most eight citations. `sources` on an upload response lists the
distinct file names within a single uploaded file, which is normally one. There is no endpoint that
lists knowledge base documents or conversation threads.

## Request size limits

JSON bodies are capped at 10 MB by the Express body parser; a larger body is rejected by the
middleware before it reaches the route.

Uploads are effectively unbounded. The multer configuration sets `fieldSize`, which limits
non-file form fields, rather than `fileSize`, so no limit applies to the uploaded file itself. A
deployment should set `fileSize` before accepting untrusted uploads.

Uploaded files are written to `uploads/` on disk and are not removed after ingestion.
