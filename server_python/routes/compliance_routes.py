from flask import Blueprint, jsonify, g
from db import get_db
from auth import require_role
from bson import ObjectId

bp = Blueprint("compliance", __name__, url_prefix="/api/compliance")

@bp.get("/stats")
@require_role("client_staff", "org_admin", "compliance_officer")
def get_stats():
    db = get_db()
    org_id = g.user["orgId"]
    
    # Total PO Value & Tax (for issued/paid POs)
    pipeline = [
        {"$lookup": {
            "from": "service_requests",
            "localField": "requestId",
            "foreignField": "_id",
            "as": "sr"
        }},
        {"$unwind": "$sr"},
        {"$match": {"sr.clientOrgId": org_id, "status": {"$in": ["issued", "paid"]}}},
        {"$group": {
            "_id": None,
            "totalAmount": {"$sum": "$amount"},
            "totalTax": {"$sum": "$taxAmount"}
        }}
    ]
    po_stats = list(db.purchase_orders.aggregate(pipeline))
    stats = po_stats[0] if po_stats else {"totalAmount": 0, "totalTax": 0}
    
    # Completed Jobs (this month)
    # Simple count for now, could be filtered by date
    completed_count = db.service_requests.count_documents({
        "clientOrgId": org_id,
        "status": "completed"
    })
    
    return jsonify({
        "totalPoValue": round(stats.get("totalAmount", 0), 2),
        "totalTax": round(stats.get("totalTax", 0), 2),
        "completedJobs": completed_count
    })

@bp.get("/verifications")
@require_role("client_staff", "org_admin", "compliance_officer")
def get_verifications():
    db = get_db()
    org_id = g.user["orgId"]
    
    # Fetch jobs that are 'in_progress' or 'accepted' (meaning they are coming up or active)
    # but primarily 'in_progress' are the ones ready for scan-out.
    cur = db.service_requests.find({
        "clientOrgId": org_id,
        "status": {"$in": ["in_progress", "accepted"]}
    }).sort("updatedAt", -1)
    
    out = []
    for sr in cur:
        provider = db.organizations.find_one({"_id": sr["providerOrgId"]})
        po = db.purchase_orders.find_one({"requestId": sr["_id"]})
        out.append({
            "id": po.get("poNumber") if po else str(sr["_id"]),
            "requestId": str(sr["_id"]),
            "provider": provider.get("name") if provider else "Unknown",
            "date": sr.get("scheduledDate").strftime("%d/%m/%Y") if sr.get("scheduledDate") else "N/A",
            "status": sr.get("status"),
            "label": sr.get("status").replace("_", " ").title()
        })
    return jsonify(out)

@bp.get("/orders")
@require_role("client_staff", "org_admin", "compliance_officer")
def get_orders():
    db = get_db()
    org_id = g.user["orgId"]
    
    pipeline = [
        {"$lookup": {
            "from": "service_requests",
            "localField": "requestId",
            "foreignField": "_id",
            "as": "sr"
        }},
        {"$unwind": "$sr"},
        {"$match": {"sr.clientOrgId": org_id}},
        {"$sort": {"issuedAt": -1}}
    ]
    
    cur = db.purchase_orders.aggregate(pipeline)
    
    out = []
    for po in cur:
        provider = db.organizations.find_one({"_id": po["sr"]["providerOrgId"]})
        out.append({
            "po": po.get("poNumber"),
            "date": po.get("issuedAt").strftime("%m/%d/%Y") if po.get("issuedAt") else "N/A",
            "provider": provider.get("name") if provider else "Unknown",
            "status": po["sr"]["status"].replace("_", " ").title(),
            "amount": f"${po.get('totalAmount', 0):.2f}"
        })
    return jsonify(out)
