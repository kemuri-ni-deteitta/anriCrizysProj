"""Topics (categories) endpoints."""
from fastapi import APIRouter, HTTPException
from config import TOPICS_FILE
from storage import read_json, file_exists

router = APIRouter()


@router.get("")
def list_topics():
    if not file_exists(TOPICS_FILE):
        raise HTTPException(status_code=404, detail="Topics file not found")
    return read_json(TOPICS_FILE)
