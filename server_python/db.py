from pymongo import MongoClient
from config import Config

_client = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        Config.validate()
        _client = MongoClient(Config.MONGODB_URI, serverSelectionTimeoutMS=7000)
        _db = _client[Config.MONGODB_DB]
    return _db
