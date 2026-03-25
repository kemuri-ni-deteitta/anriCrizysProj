"""Tests endpoints — list and retrieve test data."""
from fastapi import APIRouter, HTTPException
from config import TESTS_DIR
from storage import read_json, file_exists

router = APIRouter()


def _load_all_tests():
    tests = []
    if not TESTS_DIR.exists():
        return tests
    for topic_dir in sorted(TESTS_DIR.iterdir()):
        if not topic_dir.is_dir():
            continue
        for test_file in sorted(topic_dir.glob("test_*.json")):
            try:
                tests.append(read_json(test_file))
            except Exception:
                pass
    return tests


@router.get("")
def list_tests(topic_id: str | None = None):
    """Return all tests, optionally filtered by topic_id."""
    tests = _load_all_tests()
    if topic_id:
        tests = [t for t in tests if t.get("topic_id") == topic_id]
    # Return summary (without questions) for the list view
    return [
        {
            "id": t["id"],
            "topic_id": t["topic_id"],
            "title": t["title"],
            "description": t["description"],
            "question_count": len(t.get("questions", []))
        }
        for t in tests
    ]


@router.get("/{test_id}")
def get_test(test_id: str):
    """Return full test data including questions and answers."""
    if not TESTS_DIR.exists():
        raise HTTPException(status_code=404, detail="Test not found")
    for topic_dir in TESTS_DIR.iterdir():
        if not topic_dir.is_dir():
            continue
        test_file = topic_dir / f"{test_id}.json"
        if file_exists(test_file):
            return read_json(test_file)
    raise HTTPException(status_code=404, detail="Test not found")
