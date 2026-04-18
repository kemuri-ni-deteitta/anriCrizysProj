# Исходный код программы
# Тренажёр антикризисного управления

---

## BACKEND (Python / FastAPI)

---

### backend/config.py

```python
import os
import sys
from pathlib import Path

if getattr(sys, 'frozen', False):
    _BACKEND_DIR = Path(sys._MEIPASS)
else:
    _BACKEND_DIR = Path(__file__).parent

_PROJECT_ROOT = _BACKEND_DIR.parent
FONTS_DIR = _BACKEND_DIR / 'fonts'

DATA_DIR = Path(os.environ.get('CRISIS_DATA_DIR', _PROJECT_ROOT / 'data'))
SESSIONS_DIR = DATA_DIR / 'sessions'
TESTS_DIR = DATA_DIR / 'tests'
AVATARS_DIR = DATA_DIR / 'avatars'
USER_FILE = DATA_DIR / 'user.json'
TOPICS_FILE = TESTS_DIR / 'topics.json'

HOST = os.environ.get('CRISIS_HOST', '127.0.0.1')
PORT = int(os.environ.get('CRISIS_PORT', '8000'))

ADMIN_LOGIN = 'admin'
ADMIN_PASSWORD = 'admin'
```

---

### backend/storage.py

```python
"""Atomic JSON read/write utilities."""
import json
import os
import tempfile
from pathlib import Path


def read_json(path: Path) -> dict | list:
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def write_json(path: Path, data: dict | list) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    dir_ = path.parent
    fd, tmp_path = tempfile.mkstemp(dir=dir_, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, path)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def file_exists(path: Path) -> bool:
    return Path(path).exists()
```

---

### backend/main.py

```python
"""Backend entry point — FastAPI + Uvicorn, runs on localhost."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import HOST, PORT
from seed import seed

app = FastAPI(title="Crisis Trainer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routes import user, topics, tests, sessions, reports, admin, dashboard

app.include_router(user.router,      prefix="/api/user",      tags=["user"])
app.include_router(topics.router,    prefix="/api/topics",    tags=["topics"])
app.include_router(tests.router,     prefix="/api/tests",     tags=["tests"])
app.include_router(sessions.router,  prefix="/api/sessions",  tags=["sessions"])
app.include_router(reports.router,   prefix="/api/reports",   tags=["reports"])
app.include_router(admin.router,     prefix="/api/admin",     tags=["admin"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    seed()
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")
```

---

### backend/routes/user.py

```python
"""User profile endpoints."""
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from config import USER_FILE, AVATARS_DIR, ADMIN_LOGIN, ADMIN_PASSWORD
from storage import read_json, write_json, file_exists

router = APIRouter()


class UserCreate(BaseModel):
    last_name: str
    first_name: str
    group: str


class UserUpdate(BaseModel):
    last_name: Optional[str] = None
    first_name: Optional[str] = None
    group: Optional[str] = None


class AdminLogin(BaseModel):
    login: str
    password: str


@router.get("")
def get_user():
    if not file_exists(USER_FILE):
        raise HTTPException(status_code=404, detail="User not registered")
    return read_json(USER_FILE)


@router.post("", status_code=201)
def create_user(data: UserCreate):
    if file_exists(USER_FILE):
        raise HTTPException(status_code=409, detail="User already exists")
    user = {
        "id": f"user_{uuid.uuid4().hex[:6]}",
        "last_name": data.last_name,
        "first_name": data.first_name,
        "group": data.group,
        "avatar_path": None,
        "created_at": datetime.now().isoformat()
    }
    write_json(USER_FILE, user)
    return user


@router.put("")
def update_user(data: UserUpdate):
    if not file_exists(USER_FILE):
        raise HTTPException(status_code=404, detail="User not registered")
    user = read_json(USER_FILE)
    if data.last_name is not None:
        user["last_name"] = data.last_name
    if data.first_name is not None:
        user["first_name"] = data.first_name
    if data.group is not None:
        user["group"] = data.group
    write_json(USER_FILE, user)
    return user


@router.get("/avatar")
def get_avatar():
    if not file_exists(USER_FILE):
        raise HTTPException(status_code=404, detail="User not registered")
    user = read_json(USER_FILE)
    path = user.get("avatar_path")
    if not path or not Path(path).exists():
        raise HTTPException(status_code=404, detail="Avatar not found")
    return FileResponse(path)


@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...)):
    if not file_exists(USER_FILE):
        raise HTTPException(status_code=404, detail="User not registered")

    allowed = {".jpg", ".jpeg", ".png"}
    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG/PNG files are allowed")

    AVATARS_DIR.mkdir(parents=True, exist_ok=True)
    user = read_json(USER_FILE)
    avatar_path = AVATARS_DIR / f"{user['id']}{suffix}"

    content = await file.read()
    avatar_path.write_bytes(content)

    user["avatar_path"] = str(avatar_path)
    write_json(USER_FILE, user)
    return {"avatar_path": str(avatar_path)}


@router.delete("")
def delete_user():
    if not file_exists(USER_FILE):
        raise HTTPException(status_code=404, detail="User not registered")
    USER_FILE.unlink()
    return {"ok": True}


@router.post("/admin-login")
def admin_login(data: AdminLogin):
    if data.login == ADMIN_LOGIN and data.password == ADMIN_PASSWORD:
        return {"role": "admin", "login": ADMIN_LOGIN}
    raise HTTPException(status_code=401, detail="Invalid credentials")
```

---

### backend/routes/topics.py

```python
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
```

---

### backend/routes/tests.py

```python
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
    tests = _load_all_tests()
    if topic_id:
        tests = [t for t in tests if t.get("topic_id") == topic_id]
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
    if not TESTS_DIR.exists():
        raise HTTPException(status_code=404, detail="Test not found")
    for topic_dir in TESTS_DIR.iterdir():
        if not topic_dir.is_dir():
            continue
        test_file = topic_dir / f"{test_id}.json"
        if file_exists(test_file):
            return read_json(test_file)
    raise HTTPException(status_code=404, detail="Test not found")
```

---

### backend/routes/sessions.py

```python
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
```

---

### backend/routes/dashboard.py

```python
"""Dashboard aggregation endpoint."""
from fastapi import APIRouter
from config import SESSIONS_DIR, TESTS_DIR, TOPICS_FILE
from storage import read_json, file_exists

router = APIRouter()


def _load_topics_map():
    if not file_exists(TOPICS_FILE):
        return {}
    return {t["id"]: t["name"] for t in read_json(TOPICS_FILE)}


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


@router.get("")
def get_dashboard():
    topics_map = _load_topics_map()

    raw_sessions = []
    if SESSIONS_DIR.exists():
        for f in sorted(SESSIONS_DIR.glob("session_*.json"), reverse=True):
            try:
                raw_sessions.append(read_json(f))
            except Exception:
                pass

    if not raw_sessions:
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
        "recent_sessions": recent[:10],
    }
```

---

### backend/routes/admin.py

```python
"""Admin endpoints — CRUD for tests and statistics."""
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import TESTS_DIR, SESSIONS_DIR, USER_FILE
from storage import read_json, write_json, file_exists

router = APIRouter()


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
    type: str
    explanation: str
    answers: List[AnswerIn]


class TestIn(BaseModel):
    topic_id: str
    title: str
    description: str
    analysis_good: str
    analysis_improve: str
    questions: List[QuestionIn]


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
```

---

### backend/routes/reports.py

```python
"""Report generation endpoints — PDF and DOCX."""
import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import SESSIONS_DIR, USER_FILE, TESTS_DIR, FONTS_DIR
from storage import read_json, file_exists

router = APIRouter()


class ReportRequest(BaseModel):
    session_id: str
    format: str  # "pdf" or "docx"


def _load_report_data(session_id: str):
    session_path = SESSIONS_DIR / f"{session_id}.json"
    if not file_exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found")

    session = read_json(session_path)
    user = read_json(USER_FILE) if file_exists(USER_FILE) else {}

    test = None
    if TESTS_DIR.exists():
        for topic_dir in TESTS_DIR.iterdir():
            if not topic_dir.is_dir():
                continue
            test_file = topic_dir / f"{session['test_id']}.json"
            if file_exists(test_file):
                test = read_json(test_file)
                break

    if not test:
        raise HTTPException(status_code=404, detail="Test not found for this session")

    return session, user, test


def _build_pdf(session, user, test) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    pdfmetrics.registerFont(TTFont('DejaVu',      str(FONTS_DIR / 'DejaVuSans.ttf')))
    pdfmetrics.registerFont(TTFont('DejaVu-Bold', str(FONTS_DIR / 'DejaVuSans-Bold.ttf')))

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    base          = {'fontName': 'DejaVu', 'fontSize': 10, 'spaceAfter': 4, 'leading': 14}
    title_style   = ParagraphStyle('RTitle',   fontName='DejaVu-Bold', fontSize=16, spaceAfter=6, leading=22)
    heading_style = ParagraphStyle('RHeading', fontName='DejaVu-Bold', fontSize=12, spaceAfter=4, leading=16)
    body_style    = ParagraphStyle('RBody',    **base)
    correct_style = ParagraphStyle('RCorrect', textColor=colors.HexColor('#2e7d32'), **base)
    wrong_style   = ParagraphStyle('RWrong',   textColor=colors.HexColor('#c62828'), **base)

    story = []
    story.append(Paragraph("Тренажёр антикризисного управления", title_style))
    story.append(Paragraph("Отчёт о прохождении теста", heading_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
    story.append(Spacer(1, 0.3*cm))

    full_name = f"{user.get('last_name', '')} {user.get('first_name', '')}".strip()
    story.append(Paragraph(f"Студент: {full_name}", body_style))
    story.append(Paragraph(f"Группа: {user.get('group', '—')}", body_style))
    story.append(Paragraph(f"Дата: {session.get('finished_at', '')[:10]}", body_style))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(f"Тест: {test['title']}", heading_style))
    story.append(Spacer(1, 0.3*cm))

    answer_map = {a['question_id']: a for a in session.get('answers', [])}
    correct_count = 0
    total = len(test.get('questions', []))

    for q in test.get('questions', []):
        story.append(Paragraph(f"Вопрос {q['order']}: {q['text']}", heading_style))
        session_answer = answer_map.get(q['id'], {})
        selected_ids = set(session_answer.get('selected_answer_ids', []))
        correct_ids  = {a['id'] for a in q['answers'] if a['is_correct']}

        if selected_ids == correct_ids:
            correct_count += 1

        for ans in q['answers']:
            if ans['is_correct'] and ans['id'] in selected_ids:
                marker, style = "✓ ", correct_style
            elif ans['id'] in selected_ids and not ans['is_correct']:
                marker, style = "✗ ", wrong_style
            elif ans['is_correct']:
                marker, style = "→ ", correct_style
            else:
                marker, style = "", body_style
            story.append(Paragraph(f"  {marker}{ans['text']}", style))

        if session_answer.get('comment'):
            story.append(Paragraph(f"Комментарий студента: {session_answer['comment']}", body_style))
        story.append(Paragraph(f"Пояснение: {q['explanation']}", body_style))
        story.append(Spacer(1, 0.3*cm))

    story.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
    story.append(Spacer(1, 0.2*cm))
    pct = round(correct_count / total * 100) if total else 0
    story.append(Paragraph(f"Результат: {correct_count} из {total} ({pct}%)", heading_style))
    story.append(Paragraph(f"Что сделано верно: {test.get('analysis_good', '')}", body_style))
    story.append(Paragraph(f"Что стоит улучшить: {test.get('analysis_improve', '')}", body_style))

    doc.build(story)
    return buf.getvalue()


def _build_docx(session, user, test) -> bytes:
    from docx import Document
    from docx.shared import RGBColor

    doc = Document()
    doc.add_heading("Тренажёр антикризисного управления", 0)
    doc.add_heading("Отчёт о прохождении теста", 1)

    full_name = f"{user.get('last_name', '')} {user.get('first_name', '')}".strip()
    doc.add_paragraph(f"Студент: {full_name}")
    doc.add_paragraph(f"Группа: {user.get('group', '—')}")
    doc.add_paragraph(f"Дата: {session.get('finished_at', '')[:10]}")
    doc.add_paragraph(f"Тест: {test['title']}")
    doc.add_paragraph("")

    answer_map = {a['question_id']: a for a in session.get('answers', [])}
    correct_count = 0
    total = len(test.get('questions', []))

    for q in test.get('questions', []):
        doc.add_heading(f"Вопрос {q['order']}: {q['text']}", 2)
        session_answer = answer_map.get(q['id'], {})
        selected_ids = set(session_answer.get('selected_answer_ids', []))
        correct_ids  = {a['id'] for a in q['answers'] if a['is_correct']}

        if selected_ids == correct_ids:
            correct_count += 1

        for ans in q['answers']:
            p = doc.add_paragraph()
            if ans['is_correct'] and ans['id'] in selected_ids:
                run = p.add_run(f"✓ {ans['text']}")
                run.font.color.rgb = RGBColor(0x2E, 0x7D, 0x32)
            elif ans['id'] in selected_ids and not ans['is_correct']:
                run = p.add_run(f"✗ {ans['text']}")
                run.font.color.rgb = RGBColor(0xC6, 0x28, 0x28)
            elif ans['is_correct']:
                run = p.add_run(f"→ {ans['text']}")
                run.font.color.rgb = RGBColor(0x2E, 0x7D, 0x32)
            else:
                p.add_run(f"  {ans['text']}")

        if session_answer.get('comment'):
            doc.add_paragraph(f"Комментарий: {session_answer['comment']}")
        doc.add_paragraph(f"Пояснение: {q['explanation']}")

    doc.add_heading("Итог", 1)
    pct = round(correct_count / total * 100) if total else 0
    doc.add_paragraph(f"Результат: {correct_count} из {total} ({pct}%)")
    doc.add_paragraph(f"Что сделано верно: {test.get('analysis_good', '')}")
    doc.add_paragraph(f"Что стоит улучшить: {test.get('analysis_improve', '')}")

    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


@router.post("/generate")
def generate_report(req: ReportRequest):
    session, user, test = _load_report_data(req.session_id)

    if req.format == "pdf":
        data      = _build_pdf(session, user, test)
        media_type = "application/pdf"
        filename   = f"report_{req.session_id}.pdf"
    elif req.format == "docx":
        data      = _build_docx(session, user, test)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename   = f"report_{req.session_id}.docx"
    else:
        raise HTTPException(status_code=400, detail="Format must be 'pdf' or 'docx'")

    return StreamingResponse(
        io.BytesIO(data),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
```

---

## FRONTEND (JavaScript / React + Electron)

---

### frontend/src/renderer/src/api.js

```javascript
import { CONFIG } from './config'

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body !== null) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${CONFIG.API_BASE_URL}${path}`, options)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }))
    throw new Error(error.detail || 'API error')
  }
  if (response.status === 204) return null
  return response.json()
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path)
}
```

---

### frontend/src/renderer/src/context/UserContext.jsx

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api'

const UserContext = createContext(null)

export const AUTH_STATE = {
  LOADING:      'loading',
  UNREGISTERED: 'unregistered',
  ADMIN_LOGIN:  'admin_login',
  STUDENT:      'student',
  ADMIN:        'admin'
}

export function UserProvider({ children }) {
  const [user,      setUser]      = useState(null)
  const [authState, setAuthState] = useState(AUTH_STATE.LOADING)

  useEffect(() => { checkUser() }, [])

  async function checkUser() {
    try {
      const data = await api.get('/user')
      setUser(data)
      setAuthState(AUTH_STATE.STUDENT)
    } catch (err) {
      if (err.message === 'User not registered') {
        setAuthState(AUTH_STATE.UNREGISTERED)
      } else {
        setTimeout(checkUser, 1000)
      }
    }
  }

  async function register(lastName, firstName, group) {
    const data = await api.post('/user', { last_name: lastName, first_name: firstName, group })
    setUser(data)
    setAuthState(AUTH_STATE.STUDENT)
  }

  async function adminLogin(password) {
    await api.post('/user/admin-login', { login: 'admin', password })
    setUser({ id: 'admin', last_name: 'Администратор', first_name: '', group: '', role: 'admin' })
    setAuthState(AUTH_STATE.ADMIN)
  }

  function requestAdminLogin()  { setAuthState(AUTH_STATE.ADMIN_LOGIN)  }
  function backToRegistration() { setAuthState(AUTH_STATE.UNREGISTERED) }

  async function updateUser(fields) {
    const data = await api.put('/user', fields)
    setUser(data)
    return data
  }

  async function refreshUser() {
    const data = await api.get('/user')
    setUser(data)
    return data
  }

  async function logout() {
    try { await api.delete('/user') } catch {}
    setUser(null)
    setAuthState(AUTH_STATE.UNREGISTERED)
  }

  return (
    <UserContext.Provider value={{
      user, authState,
      register, adminLogin, requestAdminLogin, backToRegistration,
      updateUser, refreshUser, logout
    }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
```

---

### frontend/src/renderer/src/App.jsx

```jsx
import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { UserProvider, useUser, AUTH_STATE } from './context/UserContext'

import Loading      from './screens/Loading'
import Registration from './screens/Registration'
import AdminLogin   from './screens/AdminLogin'
import Layout       from './components/Layout/Layout'
import Home         from './screens/Home'
import Tests        from './screens/Tests'
import TestResults  from './screens/TestResults'
import Results      from './screens/Results'
import Calendar     from './screens/Calendar'
import Reports      from './screens/Reports'
import Admin        from './screens/Admin'

function Router() {
  const { authState } = useUser()

  if (authState === AUTH_STATE.LOADING)      return <Loading />
  if (authState === AUTH_STATE.UNREGISTERED) return <Registration />
  if (authState === AUTH_STATE.ADMIN_LOGIN)  return <AdminLogin />

  const isAdmin = authState === AUTH_STATE.ADMIN

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index                        element={<Home />} />
          <Route path="tests/*"               element={<Tests />} />
          <Route path="results"               element={<Results />} />
          <Route path="results/:sessionId"    element={<TestResults />} />
          <Route path="calendar"              element={<Calendar />} />
          <Route path="reports"               element={<Reports />} />
          {isAdmin && <Route path="admin/*"   element={<Admin />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default function App() {
  return (
    <UserProvider>
      <Router />
    </UserProvider>
  )
}
```

---

### frontend/src/renderer/src/screens/Registration.jsx

```jsx
import React, { useState } from 'react'
import { useUser } from '../context/UserContext'
import styles from './Registration.module.css'

export default function Registration() {
  const { register, requestAdminLogin } = useUser()

  const [lastName,  setLastName]  = useState('')
  const [firstName, setFirstName] = useState('')
  const [group,     setGroup]     = useState('')
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmed = {
      lastName:  lastName.trim(),
      firstName: firstName.trim(),
      group:     group.trim()
    }

    if (!trimmed.lastName || !trimmed.firstName || !trimmed.group) {
      setError('Заполните все поля')
      return
    }

    if (trimmed.lastName.toLowerCase() === 'admin') {
      requestAdminLogin()
      return
    }

    setLoading(true)
    try {
      await register(trimmed.lastName, trimmed.firstName, trimmed.group)
    } catch (err) {
      setError(err.message || 'Ошибка при сохранении данных')
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Тренажёр антикризисного управления</h1>
        <p className={styles.subtitle}>Введите ваши данные для начала работы</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label className={styles.label}>Фамилия</label>
            <input className={styles.input} type="text" value={lastName}
              onChange={e => setLastName(e.target.value)} disabled={loading} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Имя</label>
            <input className={styles.input} type="text" value={firstName}
              onChange={e => setFirstName(e.target.value)} disabled={loading} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Группа</label>
            <input className={styles.input} type="text" value={group}
              onChange={e => setGroup(e.target.value)} disabled={loading} />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Сохранение...' : 'Приступить'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

---

### frontend/src/renderer/src/screens/Home.jsx

```jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { TOPIC_COLORS, TOPIC_ID_ICONS } from '../theme'
import styles from './Home.module.css'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const diffDays = Math.floor((new Date() - d) / 86400000)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  if (diffDays < 7)  return `${diffDays} дня назад`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function scoreColor(pct) {
  if (pct === null || pct === undefined) return 'var(--color-text-secondary)'
  if (pct >= 70) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue} style={accent ? { color: accent } : {}}>
        {value ?? '—'}
      </span>
      {sub && <span className={styles.metricSub}>{sub}</span>}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { data, loading, error } = useAsync(() => api.get('/dashboard'))

  return (
    <>
      <PageHeader title="Главная" />
      <div className={styles.content}>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Дашборд</h2>
          <div className={styles.metrics}>
            {loading ? <div className={styles.skeleton3} /> : error ? (
              <p className={styles.errorText}>Ошибка загрузки</p>
            ) : (
              <>
                <MetricCard label="Пройдено тестов"
                  value={data.total_sessions} sub={`из ${data.total_tests} доступных`} />
                <MetricCard label="Правильных ответов"
                  value={data.avg_correct_pct !== null ? `${data.avg_correct_pct}%` : '—'}
                  sub="средний показатель" accent={scoreColor(data.avg_correct_pct)} />
                <MetricCard label="Последний тест"
                  value={data.last_session?.test_title ?? 'Нет данных'}
                  sub={data.last_session ? formatDate(data.last_session.finished_at) : undefined} />
              </>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Последние прохождения</h2>
          {!loading && !error && data.recent_sessions.length === 0 && (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>Тестов пока не пройдено</p>
              <button className={styles.emptyBtn} onClick={() => navigate('/tests')}>
                Перейти к тестам →
              </button>
            </div>
          )}
          {!loading && !error && data.recent_sessions.length > 0 && (
            <div className={styles.sessionCards}>
              {data.recent_sessions.map(s => (
                <button key={s.session_id} className={styles.sessionCard}
                  style={{ '--tc': TOPIC_COLORS[s.topic_id] ?? '#6b7280' }}
                  onClick={() => navigate(`/results/${s.session_id}`)}>
                  <div className={styles.cardBody}>
                    <span className={styles.cardTitle}>{s.test_title}</span>
                    <span className={styles.cardMeta}>{s.topic_name} · {formatDate(s.finished_at)}</span>
                  </div>
                  <span className={styles.cardPct} style={{ color: scoreColor(s.correct_pct) }}>
                    {s.correct_pct}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

      </div>
    </>
  )
}
```

---

### frontend/src/renderer/src/screens/tests/TopicsGrid.jsx

```jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader/PageHeader'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../api'
import { TOPIC_COLORS, TOPIC_ICONS } from '../../theme'
import styles from './TopicsGrid.module.css'

export default function TopicsGrid() {
  const navigate = useNavigate()
  const { data: topics, loading: tLoading, error: tError } = useAsync(() => api.get('/topics'))
  const { data: tests,  loading: testsLoading }             = useAsync(() => api.get('/tests'))
  const loading = tLoading || testsLoading

  const countByTopic = React.useMemo(() => {
    if (!tests) return {}
    return tests.reduce((acc, t) => {
      acc[t.topic_id] = (acc[t.topic_id] || 0) + 1
      return acc
    }, {})
  }, [tests])

  return (
    <>
      <PageHeader title="Тесты" />
      <div className={styles.content}>
        <p className={styles.hint}>Выберите тематику для прохождения теста</p>
        <div className={styles.grid}>
          {(topics || []).map(topic => {
            const color = TOPIC_COLORS[topic.color_key] || '#6b7280'
            const icon  = TOPIC_ICONS[topic.icon_key]   || '📁'
            const count = countByTopic[topic.id] || 0
            return (
              <button key={topic.id} className={styles.card}
                onClick={() => navigate(topic.id)}
                style={{ '--topic-color': color }}>
                <div className={styles.cardIcon} style={{ background: color + '22' }}>
                  <span className={styles.cardEmoji}>{icon}</span>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{topic.name}</h3>
                  <p className={styles.cardCount}>{count} тестов</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
```

---

### frontend/src/renderer/src/screens/tests/TestSession.jsx

```jsx
import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../api'
import { TOPIC_COLORS } from '../../theme'
import Loading from '../Loading'
import styles from './TestSession.module.css'

function AnswerOption({ answer, type, selected, onToggle }) {
  return (
    <label htmlFor={`ans_${answer.id}`}
      className={`${styles.option} ${selected ? styles.optionSelected : ''}`}>
      <input id={`ans_${answer.id}`} type={type === 'single' ? 'radio' : 'checkbox'}
        className={styles.optionInput} checked={selected}
        onChange={() => onToggle(answer.id)} />
      <span className={styles.optionText}>{answer.text}</span>
      <span className={styles.optionMeta}>
        ⏱ {answer.time_hours}ч &nbsp; 💰 {answer.cost_rub.toLocaleString('ru-RU')}₽
      </span>
    </label>
  )
}

export default function TestSession() {
  const { topicId, testId } = useParams()
  const navigate = useNavigate()

  const [currentIdx,  setCurrentIdx]  = useState(0)
  const [answers,     setAnswers]     = useState({})
  const [startedAt]                   = useState(() => new Date().toISOString())
  const [submitting,  setSubmitting]  = useState(false)
  const [exitConfirm, setExitConfirm] = useState(false)

  const { data: test, loading, error } = useAsync(() => api.get(`/tests/${testId}`), [testId])

  const questions     = test?.questions ?? []
  const total         = questions.length
  const question      = questions[currentIdx]
  const isLast        = currentIdx === total - 1
  const isFirst       = currentIdx === 0
  const color         = TOPIC_COLORS[test?.topic_id] ?? 'var(--color-accent)'
  const currentAnswer = answers[question?.id] ?? { selectedIds: [], comment: '' }

  const toggleAnswer = useCallback((questionId, answerId, type) => {
    setAnswers(prev => {
      const existing = prev[questionId] ?? { selectedIds: [], comment: '' }
      const ids = type === 'single'
        ? [answerId]
        : existing.selectedIds.includes(answerId)
          ? existing.selectedIds.filter(id => id !== answerId)
          : [...existing.selectedIds, answerId]
      return { ...prev, [questionId]: { ...existing, selectedIds: ids } }
    })
  }, [])

  const setComment = useCallback((questionId, comment) => {
    setAnswers(prev => {
      const existing = prev[questionId] ?? { selectedIds: [], comment: '' }
      return { ...prev, [questionId]: { ...existing, comment } }
    })
  }, [])

  async function handleFinish() {
    setSubmitting(true)
    try {
      const payload = {
        test_id:     testId,
        topic_id:    topicId,
        started_at:  startedAt,
        finished_at: new Date().toISOString(),
        answers: questions.map(q => ({
          question_id:         q.id,
          selected_answer_ids: answers[q.id]?.selectedIds ?? [],
          comment:             answers[q.id]?.comment     ?? ''
        }))
      }
      const session = await api.post('/sessions', payload)
      navigate(`/results/${session.id}`, { state: { test, session } })
    } catch (err) {
      setSubmitting(false)
      alert('Ошибка сохранения: ' + err.message)
    }
  }

  if (loading) return <Loading />

  const answeredCount = questions.filter(q => (answers[q.id]?.selectedIds?.length ?? 0) > 0).length
  const progress      = Math.round((answeredCount / total) * 100)

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <button className={styles.exitBtn} onClick={() => setExitConfirm(true)}>✕ Выйти</button>
        <span className={styles.testTitle}>{test.title}</span>
        <span className={styles.progressLabel}>{answeredCount} из {total} отвечено</span>
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progress}%`, background: color }} />
      </div>

      <div className={styles.content}>
        <div className={styles.questionPane}>
          <span className={styles.qBadge} style={{ background: color + '22', color }}>
            {question.type === 'single' ? 'Один ответ' : 'Несколько ответов'}
          </span>
          <h2 className={styles.questionText}>{question.text}</h2>

          <div className={styles.options}>
            {question.answers.map(answer => (
              <AnswerOption key={answer.id} answer={answer} type={question.type}
                selected={currentAnswer.selectedIds.includes(answer.id)}
                onToggle={(id) => toggleAnswer(question.id, id, question.type)} />
            ))}
          </div>

          <textarea className={styles.commentTextarea} value={currentAnswer.comment}
            onChange={e => setComment(question.id, e.target.value)}
            placeholder="Напишите, почему выбрали этот вариант..." rows={3} />

          <div className={styles.nav}>
            <button className={styles.navBtnSecondary} onClick={() => setCurrentIdx(i => i - 1)}
              disabled={isFirst}>← Назад</button>
            {isLast ? (
              <button className={styles.navBtnPrimary} onClick={handleFinish}
                disabled={submitting} style={{ background: color }}>
                {submitting ? 'Сохранение...' : 'Завершить тест'}
              </button>
            ) : (
              <button className={styles.navBtnPrimary} onClick={() => setCurrentIdx(i => i + 1)}
                style={{ background: color }}>Далее →</button>
            )}
          </div>
        </div>
      </div>

      {exitConfirm && (
        <div className={styles.overlay}>
          <div className={styles.confirmModal}>
            <h3>Выйти из теста?</h3>
            <p>Прогресс не сохранится.</p>
            <button onClick={() => setExitConfirm(false)}>Продолжить</button>
            <button onClick={() => navigate(`/tests/${topicId}`)}>Выйти</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

### frontend/src/renderer/src/screens/TestResults.jsx

```jsx
import React from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { TOPIC_COLORS } from '../theme'
import PageHeader from '../components/PageHeader/PageHeader'
import Loading from './Loading'
import styles from './TestResults.module.css'

export default function TestResults() {
  const { sessionId } = useParams()
  const navigate      = useNavigate()
  const location      = useLocation()

  const { data: sessionData, loading: sLoading } = useAsync(
    () => location.state?.session
      ? Promise.resolve(location.state.session)
      : api.get(`/sessions/${sessionId}`),
    [sessionId]
  )
  const { data: testData, loading: tLoading } = useAsync(
    () => location.state?.test
      ? Promise.resolve(location.state.test)
      : api.get(`/tests/${sessionData?.test_id}`),
    [sessionData?.test_id]
  )

  if (sLoading || tLoading || !sessionData || !testData) return <Loading />

  const session  = sessionData
  const test     = testData
  const color    = TOPIC_COLORS[test.topic_id] ?? 'var(--color-accent)'
  const answerMap = Object.fromEntries(session.answers.map(a => [a.question_id, a]))

  let correctCount = 0
  for (const q of test.questions) {
    const correctIds = new Set(q.answers.filter(a => a.is_correct).map(a => a.id))
    const selected   = new Set(answerMap[q.id]?.selected_answer_ids ?? [])
    if (correctIds.size === selected.size && [...correctIds].every(id => selected.has(id)))
      correctCount++
  }
  const total      = test.questions.length
  const pct        = total ? Math.round(correctCount / total * 100) : 0
  const scoreColor = pct >= 70
    ? 'var(--color-success)'
    : pct >= 40 ? 'var(--color-warning)' : 'var(--color-error)'

  return (
    <>
      <PageHeader title="Результаты теста">
        <button className={styles.homeBtn} onClick={() => navigate('/')}>На главную</button>
      </PageHeader>

      <div className={styles.content}>
        <div className={styles.summary}>
          <div className={styles.summaryScore} style={{ borderColor: scoreColor }}>
            <span className={styles.scoreNumber} style={{ color: scoreColor }}>{pct}%</span>
            <span className={styles.scoreLabel}>{correctCount} из {total} верно</span>
          </div>
          <div className={styles.summaryInfo}>
            <h2 className={styles.summaryTitle} style={{ color }}>{test.title}</h2>
            <div className={styles.analysisBlock}>
              <p><span style={{ color: 'var(--color-success)' }}>✓</span> {test.analysis_good}</p>
              <p><span style={{ color: 'var(--color-warning)' }}>△</span> {test.analysis_improve}</p>
            </div>
          </div>
        </div>

        <h3 className={styles.sectionTitle}>Разбор вопросов</h3>
        <div className={styles.questions}>
          {test.questions.map((q, qi) => {
            const sessionAns  = answerMap[q.id] ?? { selected_answer_ids: [], comment: '' }
            const selectedSet = new Set(sessionAns.selected_answer_ids)
            const correctSet  = new Set(q.answers.filter(a => a.is_correct).map(a => a.id))
            const isCorrect   = correctSet.size === selectedSet.size &&
              [...correctSet].every(id => selectedSet.has(id))

            return (
              <div key={q.id} className={`${styles.qCard} ${isCorrect ? styles.qCorrect : styles.qWrong}`}>
                <div className={styles.qHeader}>
                  <span className={styles.qStatus}
                    style={{ background: isCorrect ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                  <span className={styles.qText}>{q.text}</span>
                </div>
                <div className={styles.answers}>
                  {q.answers.map(ans => {
                    const wasSelected = selectedSet.has(ans.id)
                    const isRight     = ans.is_correct
                    let cls = styles.ansDefault
                    if (isRight && wasSelected)   cls = styles.ansCorrectSelected
                    else if (isRight)             cls = styles.ansCorrectMissed
                    else if (wasSelected)         cls = styles.ansWrongSelected
                    return (
                      <div key={ans.id} className={`${styles.ansRow} ${cls}`}>
                        <span>{isRight && wasSelected ? '✓' : !isRight && wasSelected ? '✗' : isRight ? '→' : ''}</span>
                        <span>{ans.text}</span>
                        <span>⏱ {ans.time_hours}ч &nbsp; 💰 {ans.cost_rub.toLocaleString('ru-RU')}₽</span>
                      </div>
                    )
                  })}
                </div>
                <div className={styles.explanation}>Пояснение: {q.explanation}</div>
              </div>
            )
          })}
        </div>

        <div className={styles.actions}>
          <button onClick={() => navigate(`/tests/${test.topic_id}`)}>Пройти снова</button>
          <button onClick={() => navigate('/reports')}>Перейти к отчётам</button>
          <button style={{ background: color }} onClick={() => navigate('/')}>На главную</button>
        </div>
      </div>
    </>
  )
}
```

---

### frontend/src/renderer/src/screens/Results.jsx

```jsx
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { TOPIC_COLORS, TOPIC_ID_ICONS } from '../theme'
import styles from './Results.module.css'

function scoreColor(pct) {
  if (pct >= 70) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
}

export default function Results() {
  const navigate = useNavigate()
  const [activeTopicId, setActiveTopicId] = useState('all')

  const { data: sessions, loading, error } = useAsync(() => api.get('/sessions/detailed'))
  const { data: topics }                   = useAsync(() => api.get('/topics'))

  const usedTopicIds = useMemo(() => {
    if (!sessions) return []
    return [...new Set(sessions.map(s => s.topic_id))]
  }, [sessions])

  const filtered = useMemo(() => {
    if (!sessions) return []
    return activeTopicId === 'all' ? sessions : sessions.filter(s => s.topic_id === activeTopicId)
  }, [sessions, activeTopicId])

  const topicsMap = useMemo(() => {
    if (!topics) return {}
    return Object.fromEntries(topics.map(t => [t.id, t.name]))
  }, [topics])

  return (
    <>
      <PageHeader title="Мои результаты" />
      <div className={styles.content}>

        {!loading && sessions?.length > 0 && (
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${activeTopicId === 'all' ? styles.tabActive : ''}`}
              onClick={() => setActiveTopicId('all')}>Все ({sessions.length})</button>
            {usedTopicIds.map(id => (
              <button key={id}
                className={`${styles.tab} ${activeTopicId === id ? styles.tabActive : ''}`}
                onClick={() => setActiveTopicId(id)}>
                {TOPIC_ID_ICONS[id]} {topicsMap[id] ?? id}
              </button>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className={styles.list}>
            {filtered.map(s => (
              <div key={s.session_id} className={styles.row}>
                <div className={styles.scoreCircle}
                  style={{ borderColor: scoreColor(s.correct_pct), color: scoreColor(s.correct_pct) }}>
                  {s.correct_pct}%
                </div>
                <div className={styles.info}>
                  <span className={styles.testTitle}>{s.test_title}</span>
                  <span>{s.topic_name} · {s.correct} из {s.total} верно</span>
                </div>
                <button className={styles.reviewBtn}
                  onClick={() => navigate(`/results/${s.session_id}`)}>
                  Посмотреть разбор
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  )
}
```

---

### frontend/src/renderer/src/screens/Calendar.jsx

```jsx
import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { TOPIC_COLORS, TOPIC_ID_ICONS } from '../theme'
import styles from './Calendar.module.css'

const WEEKDAYS  = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь',
                   'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function scoreColor(pct) {
  if (pct >= 70) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
}

export default function Calendar() {
  const navigate = useNavigate()
  const today    = new Date()
  const [year,         setYear]         = useState(today.getFullYear())
  const [month,        setMonth]        = useState(today.getMonth())
  const [selectedDay,  setSelectedDay]  = useState(null)

  const { data: sessions, loading } = useAsync(() => api.get('/sessions/detailed'))

  const sessionsByDate = useMemo(() => {
    if (!sessions) return {}
    const map = {}
    for (const s of sessions) {
      const d = s.finished_at?.slice(0, 10)
      if (!d) continue
      if (!map[d]) map[d] = []
      map[d].push(s)
    }
    return map
  }, [sessions])

  const cells            = buildCalendarGrid(year, month)
  const todayStr         = today.toISOString().slice(0, 10)
  const selectedSessions = selectedDay ? (sessionsByDate[selectedDay] ?? []) : []

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  return (
    <>
      <PageHeader title="Календарь" />
      <div className={styles.content}>
        <div className={styles.layout}>

          <div className={styles.calPanel}>
            <div className={styles.navRow}>
              <button onClick={prevMonth}>‹</button>
              <h2>{MONTHS_RU[month]} {year}</h2>
              <button onClick={nextMonth}>›</button>
            </div>

            <div className={styles.grid7}>
              {WEEKDAYS.map(d => <div key={d} className={styles.weekday}>{d}</div>)}
            </div>

            <div className={styles.grid7}>
              {cells.map((date, i) => {
                if (!date) return <div key={`e${i}`} className={styles.emptyCell} />
                const str     = date.toISOString().slice(0, 10)
                const daySess = sessionsByDate[str] ?? []
                const bestPct = daySess.length > 0 ? Math.max(...daySess.map(s => s.correct_pct)) : null
                return (
                  <button key={str}
                    className={`${styles.dayCell} ${str === todayStr ? styles.dayCellToday : ''} ${daySess.length > 0 ? styles.dayCellHasData : ''} ${str === selectedDay ? styles.dayCellSelected : ''}`}
                    onClick={() => daySess.length > 0 && setSelectedDay(prev => prev === str ? null : str)}
                    disabled={!daySess.length}>
                    <span>{date.getDate()}</span>
                    {daySess.length > 0 && (
                      <span className={styles.dayDot} style={{ background: scoreColor(bestPct) }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.detailPanel}>
            {selectedSessions.length > 0 && selectedSessions.map(s => (
              <button key={s.session_id} className={styles.detailCard}
                onClick={() => navigate(`/results/${s.session_id}`)}>
                <span>{s.test_title}</span>
                <span style={{ color: scoreColor(s.correct_pct) }}>{s.correct_pct}%</span>
              </button>
            ))}
          </div>

        </div>
      </div>
    </>
  )
}
```

---

### frontend/src/renderer/src/screens/Reports.jsx

```jsx
import React, { useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { api } from '../api'
import { TOPIC_COLORS, TOPIC_ID_ICONS } from '../theme'
import { CONFIG } from '../config'
import styles from './Reports.module.css'

function scoreColor(pct) {
  if (pct >= 70) return 'var(--color-success)'
  if (pct >= 40) return 'var(--color-warning)'
  return 'var(--color-error)'
}

export default function Reports() {
  const [selectedId,  setSelectedId]  = useState(null)
  const [format,      setFormat]      = useState('pdf')
  const [downloading, setDownloading] = useState(false)
  const [dlError,     setDlError]     = useState(null)

  const { data: sessions, loading, error } = useAsync(() => api.get('/sessions/detailed'))
  const selected = useMemo(
    () => sessions?.find(s => s.session_id === selectedId) ?? null,
    [sessions, selectedId]
  )

  async function handleDownload() {
    if (!selectedId) return
    setDlError(null)
    setDownloading(true)
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: selectedId, format })
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail ?? `Ошибка ${res.status}`)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `report_${selectedId}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setDlError(e.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <PageHeader title="Отчёты" />
      <div className={styles.content}>
        {!loading && !error && sessions?.length > 0 && (
          <div className={styles.layout}>
            <div className={styles.sessionList}>
              {sessions.map(s => (
                <button key={s.session_id}
                  className={`${styles.sessionRow} ${s.session_id === selectedId ? styles.sessionRowActive : ''}`}
                  onClick={() => { setSelectedId(s.session_id); setDlError(null) }}>
                  <span>{TOPIC_ID_ICONS[s.topic_id]} {s.test_title}</span>
                  <span style={{ color: scoreColor(s.correct_pct) }}>{s.correct_pct}%</span>
                </button>
              ))}
            </div>

            {selected && (
              <div className={styles.rightPanel}>
                <h3>{selected.test_title}</h3>
                <p style={{ color: scoreColor(selected.correct_pct) }}>
                  {selected.correct_pct}% — {selected.correct} из {selected.total} верно
                </p>
                <div className={styles.formatToggle}>
                  {['pdf', 'docx'].map(f => (
                    <button key={f}
                      className={`${styles.formatBtn} ${format === f ? styles.formatBtnActive : ''}`}
                      onClick={() => setFormat(f)}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
                {dlError && <p className={styles.dlError}>{dlError}</p>}
                <button className={styles.downloadBtn} onClick={handleDownload} disabled={downloading}>
                  {downloading ? 'Формируем отчёт…' : `Скачать ${format.toUpperCase()}`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
```

---

### frontend/src/renderer/src/components/Sidebar/Sidebar.jsx

```jsx
import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useUser, AUTH_STATE } from '../../context/UserContext'
import { HomeIcon, TestsIcon, ResultsIcon, CalendarIcon, ReportsIcon, AdminIcon } from '../Icons'
import ProfileModal from '../ProfileModal/ProfileModal'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/',         label: 'Главная',        Icon: HomeIcon     },
  { to: '/tests',    label: 'Тесты',          Icon: TestsIcon    },
  { to: '/results',  label: 'Мои результаты', Icon: ResultsIcon  },
  { to: '/calendar', label: 'Календарь',      Icon: CalendarIcon },
  { to: '/reports',  label: 'Отчёты',         Icon: ReportsIcon  }
]

export default function Sidebar() {
  const { user, authState } = useUser()
  const [profileOpen, setProfileOpen] = useState(false)
  const [collapsed,   setCollapsed]   = useState(
    () => localStorage.getItem('sidebar_collapsed') === 'true'
  )

  const isAdmin  = authState === AUTH_STATE.ADMIN
  const initials = user
    ? `${user.last_name?.[0] ?? ''}${user.first_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }

  return (
    <>
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>АУ</div>
          {!collapsed && <span className={styles.logoTitle}>Тренажёр антикризисного управления</span>}
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              title={collapsed ? label : undefined}>
              <span className={styles.navIcon}><Icon size={17} /></span>
              {!collapsed && <span className={styles.navLabel}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {isAdmin && (
          <nav className={styles.nav}>
            <NavLink to="/admin"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
              <span className={styles.navIcon}><AdminIcon size={17} /></span>
              {!collapsed && <span>Админ-панель</span>}
            </NavLink>
          </nav>
        )}

        <button className={styles.collapseBtn} onClick={toggleCollapse}>
          {!collapsed && <span>Свернуть</span>}
        </button>

        <button className={styles.profile} onClick={() => setProfileOpen(true)}>
          <div className={styles.avatar}>{initials}</div>
          {!collapsed && (
            <div className={styles.profileInfo}>
              <span>{user?.last_name} {user?.first_name}</span>
              <span>{isAdmin ? 'Администратор' : `Группа ${user?.group}`}</span>
            </div>
          )}
        </button>
      </aside>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  )
}
```

---

### frontend/src/renderer/src/components/ProfileModal/ProfileModal.jsx

```jsx
import React, { useState } from 'react'
import { useUser, AUTH_STATE } from '../../context/UserContext'
import { CloseIcon } from '../Icons'
import styles from './ProfileModal.module.css'

export default function ProfileModal({ onClose }) {
  const { user, authState, updateUser, logout } = useUser()
  const isAdmin = authState === AUTH_STATE.ADMIN

  const [lastName,  setLastName]  = useState(user?.last_name  ?? '')
  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [group,     setGroup]     = useState(user?.group      ?? '')
  const [error,     setError]     = useState('')
  const [saving,    setSaving]    = useState(false)

  async function handleSave() {
    const trimmed = {
      last_name:  lastName.trim(),
      first_name: firstName.trim(),
      group:      group.trim()
    }
    if (!trimmed.last_name || !trimmed.first_name || !trimmed.group) {
      setError('Заполните все поля')
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateUser(trimmed)
      onClose()
    } catch (err) {
      setError(err.message || 'Ошибка сохранения')
      setSaving(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{isAdmin ? 'Профиль' : 'Редактировать профиль'}</h2>
          <button className={styles.closeBtn} onClick={onClose}><CloseIcon size={18} /></button>
        </div>

        {!isAdmin && (
          <>
            <div className={styles.fields}>
              <div className={styles.field}>
                <label>Фамилия</label>
                <input className={styles.input} value={lastName}
                  onChange={e => setLastName(e.target.value)} disabled={saving} />
              </div>
              <div className={styles.field}>
                <label>Имя</label>
                <input className={styles.input} value={firstName}
                  onChange={e => setFirstName(e.target.value)} disabled={saving} />
              </div>
              <div className={styles.field}>
                <label>Группа</label>
                <input className={styles.input} value={group}
                  onChange={e => setGroup(e.target.value)} disabled={saving} />
              </div>
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>Отмена</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </>
        )}

        <div className={styles.logoutSection}>
          <button className={styles.logoutBtn} onClick={logout} disabled={saving}>
            {isAdmin ? 'Выйти из панели администратора' : 'Выйти из аккаунта'}
          </button>
        </div>
      </div>
    </div>
  )
}
```
