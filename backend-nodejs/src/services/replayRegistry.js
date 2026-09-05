import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const STATE_DIR = path.join(process.cwd(), '.phase2-state');
const STATE_FILE = path.join(STATE_DIR, 'replay_registry.json');

export class ReplayRegistry {
    static async ensureStateFile() {
        fs.mkdirSync(STATE_DIR, { recursive: true });
        if (!fs.existsSync(STATE_FILE)) {
            fs.writeFileSync(STATE_FILE, JSON.stringify({ registry: [], replay_history: [] }, null, 2));
        }
    }

    static buildIntegrityHash(record) {
        const canonical = {
            tenant_id: record.tenant_id,
            trace_id: record.trace_id,
            entity_id: record.entity_id,
            source_connector: record.source_connector,
            schema_version: record.schema_version,
            idempotency_key: record.idempotency_key,
            payload: record.payload,
        };
        return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
    }

    static async loadRegistry() {
        await this.ensureStateFile();
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        const parsed = JSON.parse(raw || '{"registry":[],"replay_history":[]}');
        return {
            registry: Array.isArray(parsed.registry) ? parsed.registry : [],
            replay_history: Array.isArray(parsed.replay_history) ? parsed.replay_history : [],
        };
    }

    static async persistRegistry(data) {
        await this.ensureStateFile();
        fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
    }

    static async registerCanonicalRecord(record) {
        const registryState = await this.loadRegistry();
        const integrity_hash = this.buildIntegrityHash(record);
        const existing = registryState.registry.find((entry) => entry.idempotency_key === record.idempotency_key || entry.trace_id === record.trace_id);

        if (existing) {
            const duplicateEntry = {
                ...existing,
                duplicate: true,
                integrity_hash,
                replayed_at: new Date().toISOString(),
            };
            return { ...duplicateEntry, duplicate: true, persisted_to_disk: true };
        }

        const entry = {
            tenant_id: record.tenant_id,
            trace_id: record.trace_id,
            entity_id: record.entity_id,
            source_connector: record.source_connector,
            schema_version: record.schema_version,
            idempotency_key: record.idempotency_key,
            integrity_hash,
            payload: record.payload,
            created_at: new Date().toISOString(),
            duplicate: false,
            persisted_to_disk: true,
        };

        registryState.registry.push(entry);
        await this.persistRegistry(registryState);

        return entry;
    }

    static async registerReplayExecution(traceId, replayName) {
        const registryState = await this.loadRegistry();
        const original = registryState.registry.find((entry) => entry.trace_id === traceId);

        if (!original) {
            throw new Error(`No original ingestion found for trace_id: ${traceId}`);
        }

        const replayEntry = {
            replay_name: replayName,
            trace_id: traceId,
            tenant_id: original.tenant_id,
            integrity_hash: original.integrity_hash,
            original_ingestion_present: true,
            replay_registered: true,
            duplicate_guard: false,
            replayed_at: new Date().toISOString(),
        };

        registryState.replay_history.push(replayEntry);
        await this.persistRegistry(registryState);
        return replayEntry;
    }

    static async getRegistry() {
        return await this.loadRegistry();
    }
}

export default ReplayRegistry;
