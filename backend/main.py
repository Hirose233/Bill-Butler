from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from database import engine, Base, SessionLocal
from models import Category
from routers import categories, transactions, exchange, summary

_DEFAULT_CATEGORIES = [
    ("Food", "expense"),
    ("Travel", "expense"),
    ("Entertainment", "expense"),
    ("daily", "expense"),
    ("Healthcare", "expense"),
    ("Other", "expense"),
    ("wages", "income"),
    ("Bank transfer", "income"),
    ("Other", "income"),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as db:
        for name, ctype in _DEFAULT_CATEGORIES:
            exists = (
                await db.execute(select(Category).where(Category.name == name))
            ).scalar_one_or_none()
            if not exists:
                db.add(Category(name=name, type=ctype))
        await db.commit()
    yield


app = FastAPI(title="Bill Butler", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(exchange.router)
app.include_router(summary.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
