import os
import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import asyncio

app = FastAPI(title="InkFlow API", version="1.0.0")

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

NOVELS_FILE = DATA_DIR / "novels.json"

templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


def load_novels() -> List[Dict]:
    if NOVELS_FILE.exists():
        with open(NOVELS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_novels(novels: List[Dict]):
    with open(NOVELS_FILE, "w", encoding="utf-8") as f:
        json.dump(novels, f, ensure_ascii=False, indent=2)


class NovelCreate(BaseModel):
    title: str
    genre: str = "xuanhuan"
    description: Optional[str] = ""


class NovelUpdate(BaseModel):
    title: Optional[str] = None
    genre: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


class ChapterCreate(BaseModel):
    title: str
    content: str = ""


class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None


class WriteRequest(BaseModel):
    targetWords: int = 3000
    style: str = "normal"
    lastContent: str = ""


@app.get("/")
async def root():
    return FileResponse(str(BASE_DIR / "templates" / "index.html"))


@app.get("/api/novels")
async def list_novels():
    novels = load_novels()
    return novels


@app.get("/api/novels/{novel_id}")
async def get_novel(novel_id: str):
    novels = load_novels()
    for novel in novels:
        if novel.get("id") == novel_id:
            return novel
    raise HTTPException(status_code=404, detail="小说不存在")


@app.post("/api/novels")
async def create_novel(novel: NovelCreate):
    novels = load_novels()
    
    new_novel = {
        "id": str(uuid.uuid4()),
        "title": novel.title,
        "genre": novel.genre,
        "description": novel.description,
        "status": "writing",
        "chapterCount": 0,
        "wordCount": 0,
        "chapters": [],
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
    
    novels.append(new_novel)
    save_novels(novels)
    return new_novel


@app.put("/api/novels/{novel_id}")
async def update_novel(novel_id: str, update: NovelUpdate):
    novels = load_novels()
    
    for i, novel in enumerate(novels):
        if novel.get("id") == novel_id:
            if update.title is not None:
                novels[i]["title"] = update.title
            if update.genre is not None:
                novels[i]["genre"] = update.genre
            if update.status is not None:
                novels[i]["status"] = update.status
            if update.description is not None:
                novels[i]["description"] = update.description
            novels[i]["updatedAt"] = datetime.now().isoformat()
            
            save_novels(novels)
            return novels[i]
    
    raise HTTPException(status_code=404, detail="小说不存在")


@app.delete("/api/novels/{novel_id}")
async def delete_novel(novel_id: str):
    novels = load_novels()
    
    for i, novel in enumerate(novels):
        if novel.get("id") == novel_id:
            novels.pop(i)
            save_novels(novels)
            return {"success": True}
    
    raise HTTPException(status_code=404, detail="小说不存在")


@app.get("/api/novels/{novel_id}/chapters")
async def list_chapters(novel_id: str):
    novels = load_novels()
    
    for novel in novels:
        if novel.get("id") == novel_id:
            return novel.get("chapters", [])
    
    raise HTTPException(status_code=404, detail="小说不存在")


@app.post("/api/novels/{novel_id}/chapters")
async def create_chapter(novel_id: str, chapter: ChapterCreate):
    novels = load_novels()
    
    for i, novel in enumerate(novels):
        if novel.get("id") == novel_id:
            chapters = novel.get("chapters", [])
            
            new_chapter = {
                "id": str(uuid.uuid4()),
                "title": chapter.title,
                "content": chapter.content,
                "wordCount": len(chapter.content),
                "status": "draft",
                "number": len(chapters) + 1,
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat()
            }
            
            chapters.append(new_chapter)
            novels[i]["chapters"] = chapters
            novels[i]["chapterCount"] = len(chapters)
            novels[i]["wordCount"] = sum(ch.get("wordCount", 0) for ch in chapters)
            novels[i]["updatedAt"] = datetime.now().isoformat()
            
            save_novels(novels)
            return new_chapter
    
    raise HTTPException(status_code=404, detail="小说不存在")


@app.get("/api/novels/{novel_id}/chapters/{chapter_id}")
async def get_chapter(novel_id: str, chapter_id: str):
    novels = load_novels()
    
    for novel in novels:
        if novel.get("id") == novel_id:
            chapters = novel.get("chapters", [])
            for chapter in chapters:
                if chapter.get("id") == chapter_id:
                    return chapter
            raise HTTPException(status_code=404, detail="章节不存在")
    
    raise HTTPException(status_code=404, detail="小说不存在")


@app.put("/api/novels/{novel_id}/chapters/{chapter_id}")
async def update_chapter(novel_id: str, chapter_id: str, update: ChapterUpdate):
    novels = load_novels()
    
    for i, novel in enumerate(novels):
        if novel.get("id") == novel_id:
            chapters = novel.get("chapters", [])
            for j, chapter in enumerate(chapters):
                if chapter.get("id") == chapter_id:
                    if update.title is not None:
                        chapters[j]["title"] = update.title
                    if update.content is not None:
                        chapters[j]["content"] = update.content
                        chapters[j]["wordCount"] = len(update.content)
                    if update.status is not None:
                        chapters[j]["status"] = update.status
                    chapters[j]["updatedAt"] = datetime.now().isoformat()
                    
                    novels[i]["chapters"] = chapters
                    novels[i]["wordCount"] = sum(ch.get("wordCount", 0) for ch in chapters)
                    novels[i]["updatedAt"] = datetime.now().isoformat()
                    
                    save_novels(novels)
                    return chapters[j]
            raise HTTPException(status_code=404, detail="章节不存在")
    
    raise HTTPException(status_code=404, detail="小说不存在")


@app.delete("/api/novels/{novel_id}/chapters/{chapter_id}")
async def delete_chapter(novel_id: str, chapter_id: str):
    novels = load_novels()
    
    for i, novel in enumerate(novels):
        if novel.get("id") == novel_id:
            chapters = novel.get("chapters", [])
            for j, chapter in enumerate(chapters):
                if chapter.get("id") == chapter_id:
                    chapters.pop(j)
                    novels[i]["chapters"] = chapters
                    novels[i]["chapterCount"] = len(chapters)
                    novels[i]["wordCount"] = sum(ch.get("wordCount", 0) for ch in chapters)
                    novels[i]["updatedAt"] = datetime.now().isoformat()
                    
                    save_novels(novels)
                    return {"success": True}
            raise HTTPException(status_code=404, detail="章节不存在")
    
    raise HTTPException(status_code=404, detail="小说不存在")


@app.post("/api/novels/{novel_id}/write")
async def write_chapter(novel_id: str, request: WriteRequest):
    novels = load_novels()
    
    for i, novel in enumerate(novels):
        if novel.get("id") == novel_id:
            chapters = novel.get("chapters", [])
            
            last_chapter = chapters[-1] if chapters else None
            
            simulated_content = f"""
这是 AI 为您续写的内容。

上一章内容摘要：{request.lastContent[:100] if request.lastContent else '暂无'}

目标字数：{request.targetWords}
写作风格：{request.style}

[这里将调用 InkOS 核心的多 Agent 写作引擎来生成内容]

新章节内容已生成并保存。
"""
            
            new_chapter = {
                "id": str(uuid.uuid4()),
                "title": f"第 {len(chapters) + 1} 章",
                "content": simulated_content,
                "wordCount": len(simulated_content),
                "status": "draft",
                "number": len(chapters) + 1,
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat()
            }
            
            chapters.append(new_chapter)
            novels[i]["chapters"] = chapters
            novels[i]["chapterCount"] = len(chapters)
            novels[i]["wordCount"] = sum(ch.get("wordCount", 0) for ch in chapters)
            novels[i]["updatedAt"] = datetime.now().isoformat()
            
            save_novels(novels)
            return new_chapter
    
    raise HTTPException(status_code=404, detail="小说不存在")


@app.get("/api/settings")
async def get_settings():
    settings_file = DATA_DIR / "settings.json"
    if settings_file.exists():
        with open(settings_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "aiProvider": "openai",
        "apiKey": "",
        "aiModel": "gpt-4o",
        "defaultGenre": "xuanhuan",
        "theme": "light"
    }


@app.post("/api/settings")
async def save_settings(settings: Dict[str, Any]):
    settings_file = DATA_DIR / "settings.json"
    with open(settings_file, "w", encoding="utf-8") as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)
    return {"success": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
