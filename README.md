# BiVerify-ComplianceSystem
web-based compliance verification app that enables organizations to track and verify service delivery using QR codes. The system ensures transparency, reduces fraud, and automates compliance monitoring without requiring any mobile application.

## Connecting to MongoDB Atlas (development)

Recommended workflow for a team:

- Keep secrets out of git. Create `server_python/.env` locally and add it to `.gitignore` (already ignored).
- Commit `server_python/.env.example` with the variable names (no secrets).
- Use MongoDB Compass or the MongoDB VS Code extension for browsing/inspecting data. The app itself should use the Atlas connection string via an environment variable.

Quick steps:

1. In Atlas: create a database user and copy the connection string (SRV form, `mongodb+srv://...`).
2. On your machine, copy `server_python/.env.example` to `server_python/.env` and fill `MONGODB_URI` with the Atlas URI.
3. Activate the venv and install driver if needed:

```powershell
cd server_python
.\.venv\Scripts\Activate.ps1
python -m pip install "pymongo[srv]"
```

4. Test connection (example provided in `server_python/db_test.py`):

```powershell
python db_test.py
```

Security notes:

- Use a least-privilege DB user for the app.
- Restrict Atlas IP access for production, use cloud or CI secrets for deployments.
