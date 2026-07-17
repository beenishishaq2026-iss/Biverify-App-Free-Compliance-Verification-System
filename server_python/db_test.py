"""Small script to test MongoDB Atlas connection using `MONGODB_URI` from .env

Usage:
  - Create `server_python/.env` (do NOT commit) with the `MONGODB_URI` value.
  - Activate your venv and run: `python db_test.py`
"""
from dotenv import load_dotenv
import os
import sys
from pymongo import MongoClient


def main():
    load_dotenv()
    uri = os.getenv("MONGODB_URI")
    if not uri:
        print("MONGODB_URI not set. Copy .env.example to .env and fill it.")
        sys.exit(1)

    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        print("Successfully connected to MongoDB Atlas (ping OK).")
    except Exception as e:
        print("Failed to connect to MongoDB Atlas:", e)
        sys.exit(2)


if __name__ == "__main__":
    main()
