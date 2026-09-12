# T-GOV-002 Code Packet

## Scope

Phase 2 security hardening for the Python CRM/Logistics backend. SETU ownership and contracts are unchanged.

## Changed Files

- `backend/phase2_security.py`: RSA key loading, SQLite replay claims, and SHA-256 chained audit log.
- `backend/auth_system.py`: RS256 signing and verification, token `jti`, request replay claims, and auth audit events.
- `backend/security_config.py`: RS256 configuration exports and production key fields.
- `backend/requirements.txt`: exact dependency pins.
- `backend/tests/test_phase2_security.py`: signature, replay, and tamper tests.

## Proof Commands

```text
cd backend
python -m pytest -q tests/test_phase2_security.py
```

Expected result: 4 passed.

## Runtime Configuration

Production requires `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`. New requests should include a unique `X-Request-ID`; duplicate request IDs for the same token are rejected with HTTP 401. Audit and replay SQLite files are written below `SECURITY_DATA_DIR` or `backend/data`.
