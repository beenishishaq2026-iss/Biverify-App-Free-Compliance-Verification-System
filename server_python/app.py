from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from routes.auth_routes import bp as auth_bp
from routes.location_routes import bp as location_bp
from routes.booking_routes import bp as booking_bp
from routes.scan_routes import bp as scan_bp
from routes.team_routes import bp as team_bp
from routes.service_request_routes import bp as service_request_bp
from routes.compliance_operations_routes import bp as compliance_ops_bp
from routes.admin_dashboard_routes import bp as admin_dashboard_bp
from routes.provider_dashboard_routes import bp as provider_dashboard_bp
from routes.incoming_request_routes import bp as incoming_requests_bp
from routes.compliance_vault_routes import bp as compliance_vault_bp
from routes.b2b_routes import bp as b2b_bp
from routes.client_dashboard_routes import bp as client_dashboard_bp
from routes.compliance_routes import bp as provider_compliance_bp
from routes.client_settings_routes import bp as client_settings_bp
from routes.audit_routes import bp as audit_bp

from routes.provider_compliance_documents_routes import bp as provider_comp_docs_bp   # ← NEW


def create_app():
    Config.validate()
    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS(
        app,
        resources={r"/api/*": {"origins": Config.CORS_ORIGINS}},
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Accept"],
        supports_credentials=False,
        max_age=600,
    )

    # ── OPTIONS preflight handler ─────────────────────────────────────────────
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = app.make_default_options_response()
            response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept"
            response.headers["Access-Control-Max-Age"] = "600"
            return response

    # ── Blueprints ────────────────────────────────────────────────────────────
    app.register_blueprint(auth_bp)
    app.register_blueprint(location_bp)
    app.register_blueprint(booking_bp)
    app.register_blueprint(scan_bp)
    app.register_blueprint(team_bp)
    app.register_blueprint(service_request_bp)
    app.register_blueprint(compliance_ops_bp)
    app.register_blueprint(admin_dashboard_bp)
    app.register_blueprint(provider_dashboard_bp)
    app.register_blueprint(incoming_requests_bp)
    app.register_blueprint(compliance_vault_bp)
    app.register_blueprint(b2b_bp)
    app.register_blueprint(client_dashboard_bp)
    app.register_blueprint(provider_compliance_bp)
    app.register_blueprint(client_settings_bp)
    app.register_blueprint(audit_bp)
    app.register_blueprint(provider_comp_docs_bp)          # ← NEW

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True})

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"error": {"code": "NOT_FOUND", "message": "Route not found"}}), 404

    @app.errorhandler(500)
    def internal(_e):
        return jsonify({"error": {"code": "INTERNAL", "message": "Server error"}}), 500

    return app


if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5050, debug=True)