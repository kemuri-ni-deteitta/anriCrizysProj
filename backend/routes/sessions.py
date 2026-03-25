"""Test session endpoints — create and retrieve completed sessions."""
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import SESSIONS_DIR, TESTS_DIR, TOPICS_FILE
from storage import read_json, write_json, file_exists

router = APIRouter()


def _find_test(test_id: str) -> dict | None:
    if not TESTS_DIR.exists():
        return None
    for topic_dir in TESTS_DIR.iterdir():
        if not topic_dir.is_dir():
            continue
        p = topic_dir / f"{test_id}.json"
        if p.exists():
            return read_json(p)
    return None


def _count_correct(session: dict, test: dict) -> tuple[int, int]:
    answer_map = {
        a["question_id"]: set(a["selected_answer_ids"])
        for a in session.get("answers", [])
    }
    correct = 0
    total   = len(test.get("questions", []))
    for q in test.get("questions", []):
        correct_ids = {a["id"] for a in q["answers"] if a["is_correct"]}
        if answer_map.get(q["id"]) == correct_ids:
            correct += 1
    return correct, total


class AnswerRecord(BaseModel):
    question_id: str
    selected_answer_ids: List[str]
    comment: Optional[str] = ""


class SessionCreate(BaseModel):
    test_id: str
    topic_id: str
    started_at: str
    finished_at: str
    answers: List[AnswerRecord]


@router.get("")
def list_sessions():
    """Return all sessions sorted by finished_at descending."""
    sessions = []
    if not SESSIONS_DIR.exists():
        return sessions
    for f in sorted(SESSIONS_DIR.glob("session_*.json"), reverse=True):
        try:
            sessions.append(read_json(f))
        except Exception:
            pass
    return sessions


@router.post("", status_code=201)
def create_session(data: SessionCreate):
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    session_id = f"session_{uuid.uuid4().hex[:8]}"
    session = {
        "id": session_id,
        "test_id": data.test_id,
        "topic_id": data.topic_id,
        "started_at": data.started_at,
        "finished_at": data.finished_at,
        "answers": [a.model_dump() for a in data.answers]
    }
    write_json(SESSIONS_DIR / f"{session_id}.json", session)
    return session


@router.get("/detailed")
def list_sessions_detailed(topic_id: str | None = None):
    """Return all sessions with pre-calculated scores and test metadata."""
    topics_map = {}
    if file_exists(TOPICS_FILE):
        topics_map = {t["id"]: t["name"] for t in read_json(TOPICS_FILE)}

    result = []
    if not SESSIONS_DIR.exists():
        return result

    for f in sorted(SESSIONS_DIR.glob("session_*.json"), reverse=True):
        try:
            s = read_json(f)
        except Exception:
            continue

        if topic_id and s.get("topic_id") != topic_id:
            continue

        test = _find_test(s["test_id"])
        if not test:
            continue

        correct, total = _count_correct(s, test)
        pct = round(correct / total * 100) if total else 0

        result.append({
            "session_id":  s["id"],
            "test_id":     s["test_id"],
            "test_title":  test["title"],
            "topic_id":    s["topic_id"],
            "topic_name":  topics_map.get(s["topic_id"], s["topic_id"]),
            "finished_at": s.get("finished_at", ""),
            "started_at":  s.get("started_at", ""),
            "correct":     correct,
            "total":       total,
            "correct_pct": pct,
        })

    return result


@router.get("/{session_id}")
def get_session(session_id: str):
    path = SESSIONS_DIR / f"{session_id}.json"
    if not file_exists(path):
        raise HTTPException(status_code=404, detail="Session not found")
    return read_json(path)
