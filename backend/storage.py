"""Atomic JSON read/write utilities."""
import json
import os
import tempfile
from pathlib import Path


def read_json(path: Path) -> dict | list:
    """Read a JSON file and return parsed content."""
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def write_json(path: Path, data: dict | list) -> None:
    """Write data to a JSON file atomically (temp file → rename)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    dir_ = path.parent
    fd, tmp_path = tempfile.mkstemp(dir=dir_, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, path)  # atomic on POSIX; best-effort on Windows
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def file_exists(path: Path) -> bool:
    return Path(path).exists()
