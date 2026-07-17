from flask import Blueprint, jsonify, request, g
from db import get_db
from bson import ObjectId
from auth import require_role
import math

bp = Blueprint('audit', __name__, url_prefix='/api')

@bp.get('/audit-logs')
@require_role('org_admin')
def get_audit_logs():
    db = get_db()
    org_id = g.user['orgId']  # matches your pattern from team_routes

    page  = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip  = (page - 1) * limit

    query = {'orgId': org_id}  # already ObjectId from g.user

    cursor = db.audit_logs.find(query).sort('timestamp', -1).skip(skip).limit(limit)
    total  = db.audit_logs.count_documents(query)

    logs = []
    for doc in cursor:
        ts = doc.get('timestamp')
        logs.append({
            'id':        str(doc['_id']),
            'time':      ts.strftime('%m/%d/%Y, %I:%M:%S %p') if ts else '',
            'user':      doc.get('userName') or doc.get('userEmail') or 'System',
            'action':    doc.get('action', ''),
            'details':   doc.get('description', ''),
            'entity':    doc.get('entity', ''),
            'ipAddress': doc.get('ipAddress', ''),
        })

    return jsonify({
        'logs':       logs,
        'total':      total,
        'page':       page,
        'totalPages': math.ceil(total / limit) if total else 1,
    })