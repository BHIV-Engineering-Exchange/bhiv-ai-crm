# T-GOV-002 Code Index

| Area              | File                                    | Responsibility                                            |
| ----------------- | --------------------------------------- | --------------------------------------------------------- |
| Key verification  | `backend/phase2_security.py`            | RS256 key loading and production configuration guard      |
| Replay protection | `backend/phase2_security.py`            | SQLite-backed `(jti, request_id)` claim table             |
| Audit proof       | `backend/phase2_security.py`            | Append-only SHA-256 hash chain and verification           |
| Authentication    | `backend/auth_system.py`                | Token issuance, verification, RBAC dependency integration |
| Configuration     | `backend/security_config.py`            | RS256 settings exposed to legacy consumers                |
| Tests             | `backend/tests/test_phase2_security.py` | Automated Phase 2 security checks                         |
| Dependencies      | `backend/requirements.txt`              | Exact package versions                                    |
