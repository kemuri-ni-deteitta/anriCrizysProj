"""User profile endpoints."""
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File
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
