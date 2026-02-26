# 🗒 Notes API

A fully functional REST API built with **zero npm dependencies** — only Node.js core modules (`http`, `fs`, `crypto`, `path`).

## Why?
This project demonstrates a deep understanding of how HTTP servers work under the hood — the same fundamentals that power Express, Fastify, and every other Node.js framework.

## Stack
- **Runtime**: Node.js (v18+)
- **Dependencies**: None
- **Persistence**: JSON file (`data/notes.json`)

## Getting Started

```bash
node server.js
# → Notes API running at http://localhost:3000
```

Or with auto-reload (Node 18+):
```bash
node --watch server.js
```

## API Reference

### List all notes
```
GET /notes
```

### Get a single note
```
GET /notes/:id
```

### Create a note
```
POST /notes
Content-Type: application/json

{ "title": "My Note", "content": "Hello world" }
```

### Update a note
```
PUT /notes/:id
Content-Type: application/json

{ "title": "Updated Title" }
```

### Delete a note
```
DELETE /notes/:id
```

## Example with curl

```bash
# Create
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -d '{"title": "First Note", "content": "This is stored in a JSON file."}'

# List
curl http://localhost:3000/notes

# Update
curl -X PUT http://localhost:3000/notes/<id> \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated content."}'

# Delete
curl -X DELETE http://localhost:3000/notes/<id>
```

## Key Concepts Demonstrated

| Concept | Where |
|---|---|
| Manual HTTP routing | `routes` array in `server.js` |
| Async stream parsing | `parseBody()` function |
| File-based persistence | `readNotes()` / `writeNotes()` |
| Proper HTTP status codes | All handlers |
| UUID generation | `crypto.randomUUID()` |
| Error handling | Every route |