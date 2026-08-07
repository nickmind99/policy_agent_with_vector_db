# Policy Agent with Vector DB

A documentation Q&A service that answers only from documents you upload, and refuses when the
uploaded documentation does not cover the question.

## The problem

A retrieval-augmented chatbot built as a single prompt fails in ways that are hard to detect. It
answers a two-part question by addressing only the part that retrieved well. It phrases a search
query in the user's wording rather than the vocabulary of the documentation, and retrieves nothing.
It fills gaps from the model's general knowledge, producing a confident answer about a price or a
policy that appears nowhere in the source material. It cites documents it never read.

For product documentation, pricing, and policy answers, a plausible invention is worse than a
refusal.

## The approach

The agent is a LangGraph state machine rather than one prompt, so each of those failures is handled
by a step that can be inspected and tested on its own:

- Incoming questions are screened for attempts to override the agent's instructions.
- The question is split into at most four sub-questions, each rewritten as a search query phrased
  in documentation vocabulary.
- Sub-questions are researched in parallel against a MongoDB Atlas vector store, filtered by
  namespace.
- One answer is synthesized across all findings, with a citation per chunk it relied on.
- The draft is verified against the retrieved chunks. Fabricated citations are caught
  deterministically; unsupported claims are caught by a judge model. Failures are rewritten, and
  after a fixed number of attempts the agent refuses instead of guessing.

Conversation history is stored in MongoDB and keyed by a thread identifier, so follow-up questions
such as "and how many projects does it include?" resolve against earlier turns. History is used
only to resolve references — never as a source of facts.

## Architecture at a glance

```mermaid
graph LR
    client[HTTP client] --> api[Express API]
    api --> ingest[Ingestion pipeline]
    api --> graph[Agent graph]
    ingest --> atlas[(MongoDB Atlas<br/>vector store)]
    graph --> atlas
    graph --> mongo[(MongoDB<br/>conversations)]
    graph --> openai[OpenAI<br/>chat + embeddings]
    ingest --> openai
```

Two HTTP operations sit in front of this: `POST /kb/upload` ingests a document, and
`POST /agent/chat` asks a question. See [API guide](./docs/api-guide.md) for conventions and
[API reference](./openapi.yaml) for the full contract. [Architecture](./docs/architecture.md)
covers the components and the design decisions behind them.

## Quickstart

### Prerequisites

- Node.js 22 or later
- An OpenAI API key
- A MongoDB Atlas cluster with Atlas Vector Search enabled. The local community server does not
  support the `$vectorSearch` stage.

### 1. Install dependencies

```bash
cd backend && npm install
```

### 2. Configure the environment

Create `backend/.env`. Every variable except `PORT` is required, and the server refuses to start if
one is missing.

```ini
PORT=5000
OPENAI_API_KEY=sk-...
MONGODB_ATLAS_URI=mongodb+srv://...
MONGODB_DB_NAME=policy_agent
KB_COLLECTION_NAME=kb_chunks
CONVERSATIONS_COLLECTION_NAME=conversations
KB_VECTOR_SEARCH_INDEX=kb_vector_index
```

### 3. Create the vector search index

Create a vector search index on the knowledge base collection, named to match
`KB_VECTOR_SEARCH_INDEX`. The field names come from the vector store configuration, and 1536 is the
dimensionality of `text-embedding-3-small`.

```json
{
  "fields": [
    { "type": "vector", "path": "embedding", "numDimensions": 1536, "similarity": "cosine" },
    { "type": "filter", "path": "namespace" }
  ]
}
```

The `namespace` filter is what keeps separate document sets from bleeding into each other.

### 4. Run the server

```bash
cd backend && npm run dev
```

### 5. Ingest a document and ask a question

```bash
curl -F "file=@pricing.pdf" http://localhost:5000/kb/upload
```

```bash
curl -X POST http://localhost:5000/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How much does the Pro plan cost?"}'
```

Atlas indexes new vectors asynchronously, so a freshly uploaded document is not searchable for a
few seconds after the upload returns.
