/**
 * Notes REST API
 * Runtime dependencies: better-sqlite3 (SQLite driver)
 * Dev dependencies: typescript, @types/node, @types/better-sqlite3
 */
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
// ─── ESM path fix ─────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = 3000;
const DB_PATH = path.join(__dirname, "data", "notes.db");
// ─── Database setup ───────────────────────────────────────────────────────────
fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });
const db = new Database(DB_PATH);
// Run once on startup — creates the table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT
  )
`);
// Prepared statements — compiled once, executed many times (fast + safe)
const stmt = {
    list: db.prepare("SELECT * FROM notes ORDER BY created_at DESC"),
    get: db.prepare("SELECT * FROM notes WHERE id = ?"),
    insert: db.prepare("INSERT INTO notes (id, title, content, created_at) VALUES (?, ?, ?, ?)"),
    update: db.prepare("UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?"),
    delete: db.prepare("DELETE FROM notes WHERE id = ?"),
};
// ─── Request Helpers ──────────────────────────────────────────────────────────
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let raw = "";
        req.on("data", (chunk) => (raw += chunk.toString()));
        req.on("end", () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            }
            catch {
                reject(new Error("Invalid JSON"));
            }
        });
    });
}
function send(res, status, data) {
    const body = JSON.stringify(data, null, 2);
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
}
// ─── Route Handlers ───────────────────────────────────────────────────────────
function serveHTML(_req, res) {
    const html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf-8");
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
}
function listNotes(_req, res) {
    const notes = stmt.list.all();
    send(res, 200, notes);
}
function getNote(_req, res, id) {
    const note = stmt.get.get(id);
    if (!note)
        return send(res, 404, { error: "Note not found" });
    send(res, 200, note);
}
async function createNote(req, res) {
    let body;
    try {
        body = await parseBody(req);
    }
    catch {
        return send(res, 400, { error: "Invalid JSON body" });
    }
    const { title, content } = body;
    if (!title || !content) {
        return send(res, 400, { error: "Both 'title' and 'content' are required" });
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    stmt.insert.run(id, title, content, now);
    send(res, 201, stmt.get.get(id));
}
async function updateNote(req, res, id) {
    const existing = stmt.get.get(id);
    if (!existing)
        return send(res, 404, { error: "Note not found" });
    let body;
    try {
        body = await parseBody(req);
    }
    catch {
        return send(res, 400, { error: "Invalid JSON body" });
    }
    const title = body.title ?? existing.title;
    const content = body.content ?? existing.content;
    if (!body.title && !body.content) {
        return send(res, 400, { error: "Provide at least 'title' or 'content' to update" });
    }
    stmt.update.run(title, content, new Date().toISOString(), id);
    send(res, 200, stmt.get.get(id));
}
function deleteNote(_req, res, id) {
    const existing = stmt.get.get(id);
    if (!existing)
        return send(res, 404, { error: "Note not found" });
    stmt.delete.run(id);
    send(res, 200, { message: `Note ${id} deleted` });
}
// ─── Router ───────────────────────────────────────────────────────────────────
const routes = [
    { method: "GET", pattern: /^\/$/, handler: (req, res) => serveHTML(req, res) },
    { method: "GET", pattern: /^\/notes$/, handler: (req, res) => listNotes(req, res) },
    { method: "GET", pattern: /^\/notes\/([^/]+)$/, handler: (req, res, m) => getNote(req, res, m[1]) },
    { method: "POST", pattern: /^\/notes$/, handler: (req, res) => createNote(req, res) },
    { method: "PUT", pattern: /^\/notes\/([^/]+)$/, handler: (req, res, m) => updateNote(req, res, m[1]) },
    { method: "DELETE", pattern: /^\/notes\/([^/]+)$/, handler: (req, res, m) => deleteNote(req, res, m[1]) },
];
// ─── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
    const url = (req.url ?? "/").split("?")[0];
    for (const route of routes) {
        const match = url.match(route.pattern);
        if (match && req.method === route.method) {
            return route.handler(req, res, match);
        }
    }
    send(res, 404, { error: `Cannot ${req.method} ${req.url}` });
});
server.listen(PORT, () => {
    console.log(`\n🗒  Notes API running at http://localhost:${PORT}`);
    console.log(`   Database: ${DB_PATH}\n`);
    console.log(`  GET    /notes          → list all notes`);
    console.log(`  GET    /notes/:id      → get one note`);
    console.log(`  POST   /notes          → create a note`);
    console.log(`  PUT    /notes/:id      → update a note`);
    console.log(`  DELETE /notes/:id      → delete a note\n`);
});
