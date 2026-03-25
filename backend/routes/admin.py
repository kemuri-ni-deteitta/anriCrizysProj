"""Admin endpoints — CRUD for tests and statistics."""
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import TESTS_DIR, SESSIONS_DIR, USER_FILE
from storage import read_json, write_json, file_exists

router = APIRouter()


# ── Pydantic models ────────────────────────────────────────────────────────────

class AnswerIn(BaseModel):
    id: Optional[str] = None
    text: str
    time_hours: float
    cost_rub: float
    hint: str
    is_correct: bool


class QuestionIn(BaseModel):
    id: Optional[str] = None
    order: int
    text: str
    type: str  # "single" | "multiple"
    explanation: str
    answers: List[AnswerIn]


class TestIn(BaseModel):
    topic_id: str
    title: str
    description: str
    analysis_good: str
    analysis_improve: str
    questions: List[QuestionIn]


# ── Helpers ────────────────────────────────────────────────────────────────────

def _find_test_path(test_id: str):
    if not TESTS_DIR.exists():
        return None
    for topic_dir in TESTS_DIR.iterdir():
        if not topic_dir.is_dir():
            continue
        p = topic_dir / f"{test_id}.json"
        if p.exists():
            return p
    return None


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("/tests")
def admin_list_tests(topic_id: str | None = None):
    tests = []
    if not TESTS_DIR.exists():
        return tests
    for topic_dir in sorted(TESTS_DIR.iterdir()):
        if not topic_dir.is_dir():
            continue
        for test_file in sorted(topic_dir.glob("test_*.json")):
            try:
                t = read_json(test_file)
                if topic_id and t.get("topic_id") != topic_id:
                    continue
                tests.append({
                    "id": t["id"],
                    "topic_id": t["topic_id"],
                    "title": t["title"],
                    "question_count": len(t.get("questions", []))
                })
            except Exception:
                pass
    return tests


@router.post("/tests", status_code=201)
def admin_create_test(data: TestIn):
    topic_dir = TESTS_DIR / data.topic_id
    topic_dir.mkdir(parents=True, exist_ok=True)

    test_id = f"test_{uuid.uuid4().hex[:10]}"
    test = _build_test_dict(test_id, data)
    write_json(topic_dir / f"{test_id}.json", test)
    return test


@router.put("/tests/{test_id}")
def admin_update_test(test_id: str, data: TestIn):
    path = _find_test_path(test_id)
    if not path:
        raise HTTPException(status_code=404, detail="Test not found")

    new_topic_dir = TESTS_DIR / data.topic_id
    new_topic_dir.mkdir(parents=True, exist_ok=True)
    new_path = new_topic_dir / f"{test_id}.json"

    test = _build_test_dict(test_id, data)
    write_json(new_path, test)

    # Remove old file if topic changed
    if path != new_path and path.exists():
        path.unlink()

    return test


@router.delete("/tests/{test_id}", status_code=204)
def admin_delete_test(test_id: str):
    path = _find_test_path(test_id)
    if not path:
        raise HTTPException(status_code=404, detail="Test not found")
    path.unlink()


@router.get("/stats")
def admin_stats():
    """Return per-session statistics for all students."""
    stats = []
    if not SESSIONS_DIR.exists():
        return stats

    user = read_json(USER_FILE) if file_exists(USER_FILE) else {}
    full_name = f"{user.get('last_name', '')} {user.get('first_name', '')}".strip()

    for f in sorted(SESSIONS_DIR.glob("session_*.json")):
        try:
            s = read_json(f)
            test_path = _find_test_path(s["test_id"])
            if not test_path:
                continue
            test = read_json(test_path)
            total = len(test.get("questions", []))
            correct = _count_correct(s, test)
            pct = round(correct / total * 100) if total else 0
            stats.append({
                "student": full_name,
                "group": user.get("group", ""),
                "test_title": test["title"],
                "topic_id": s["topic_id"],
                "finished_at": s.get("finished_at", ""),
                "correct": correct,
                "total": total,
                "percent": pct
            })
        except Exception:
            pass
    return stats


# ── Internal helpers ───────────────────────────────────────────────────────────

def _build_test_dict(test_id: str, data: TestIn) -> dict:
    questions = []
    for q in data.questions:
        q_id = q.id or f"q{uuid.uuid4().hex[:6]}"
        answers = []
        for a in q.answers:
            answers.append({
                "id": a.id or f"a{uuid.uuid4().hex[:6]}",
                "text": a.text,
                "time_hours": a.time_hours,
                "cost_rub": a.cost_rub,
                "hint": a.hint,
                "is_correct": a.is_correct
            })
        questions.append({
            "id": q_id,
            "order": q.order,
            "text": q.text,
            "type": q.type,
            "explanation": q.explanation,
            "answers": answers
        })
    return {
        "id": test_id,
        "topic_id": data.topic_id,
        "title": data.title,
        "description": data.description,
        "analysis_good": data.analysis_good,
        "analysis_improve": data.analysis_improve,
        "questions": questions
    }


def _count_correct(session: dict, test: dict) -> int:
    answer_map = {a['question_id']: set(a['selected_answer_ids'])
                  for a in session.get('answers', [])}
    count = 0
    for q in test.get('questions', []):
        correct_ids = {a['id'] for a in q['answers'] if a['is_correct']}
        if answer_map.get(q['id']) == correct_ids:
            count += 1
    return count
