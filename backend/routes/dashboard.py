"""Dashboard aggregation endpoint."""
from fastapi import APIRouter
from config import SESSIONS_DIR, TESTS_DIR, TOPICS_FILE
from storage import read_json, file_exists

router = APIRouter()


def _load_topics_map():
    """Return {topic_id: topic_name}."""
    if not file_exists(TOPICS_FILE):
        return {}
    return {t["id"]: t["name"] for t in read_json(TOPICS_FILE)}


def _find_test(test_id: str) -> dict | None:
    """Find and load a test JSON by test_id."""
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
    """Return (correct_count, total_questions)."""
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


@router.get("")
def get_dashboard():
    topics_map = _load_topics_map()

    # Load all sessions, sort newest first
    raw_sessions = []
    if SESSIONS_DIR.exists():
        for f in sorted(SESSIONS_DIR.glob("session_*.json"), reverse=True):
            try:
                raw_sessions.append(read_json(f))
            except Exception:
                pass

    if not raw_sessions:
        # Count available tests
        total_tests = 0
        if TESTS_DIR.exists():
            for d in TESTS_DIR.iterdir():
                if d.is_dir():
                    total_tests += len(list(d.glob("test_*.json")))
        return {
            "total_sessions": 0,
            "total_tests":    total_tests,
            "avg_correct_pct": None,
            "last_session":    None,
            "recent_sessions": []
        }

    # Aggregate
    pct_sum    = 0
    pct_count  = 0
    recent     = []
    seen_tests = set()

    for s in raw_sessions:
        test = _find_test(s["test_id"])
        if not test:
            continue

        correct, total = _count_correct(s, test)
        pct = round(correct / total * 100) if total else 0

        pct_sum   += pct
        pct_count += 1
        seen_tests.add(s["test_id"])

        recent.append({
            "session_id":  s["id"],
            "test_id":     s["test_id"],
            "test_title":  test["title"],
            "topic_id":    s["topic_id"],
            "topic_name":  topics_map.get(s["topic_id"], s["topic_id"]),
            "finished_at": s.get("finished_at", ""),
            "correct":     correct,
            "total":       total,
            "correct_pct": pct,
        })

    # Count total available tests
    total_available = 0
    if TESTS_DIR.exists():
        for d in TESTS_DIR.iterdir():
            if d.is_dir():
                total_available += len(list(d.glob("test_*.json")))

    last = recent[0] if recent else None

    return {
        "total_sessions":  len(raw_sessions),
        "total_tests":     total_available,
        "avg_correct_pct": round(pct_sum / pct_count) if pct_count else None,
        "last_session":    last,
        "recent_sessions": recent[:10],  # last 10
    }
