from typing import Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import get_db
from models import Transaction
from schemas import TransactionCreate, TransactionRead

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionRead])
async def list_transactions(
    start_date: Optional[str] = Query(None, description="Filter from date inclusive (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter to date inclusive (YYYY-MM-DD)"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    transaction_type: Optional[Literal["income", "expense"]] = Query(None, alias="type"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Transaction)
        .options(selectinload(Transaction.category))
        .order_by(Transaction.date.desc())
    )
    if start_date is not None:
        stmt = stmt.where(Transaction.date >= start_date)
    if end_date is not None:
        stmt = stmt.where(Transaction.date <= end_date)
    if category_id is not None:
        stmt = stmt.where(Transaction.category_id == category_id)
    if transaction_type is not None:
        stmt = stmt.where(Transaction.type == transaction_type)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=TransactionRead, status_code=status.HTTP_201_CREATED)
async def create_transaction(payload: TransactionCreate, db: AsyncSession = Depends(get_db)):
    transaction = Transaction(**payload.model_dump())
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction, ["category"])
    return transaction


@router.get("/{transaction_id}", response_model=TransactionRead)
async def get_transaction(transaction_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.id == transaction_id)
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.put("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(
    transaction_id: int, payload: TransactionCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Transaction)
        .options(selectinload(Transaction.category))
        .where(Transaction.id == transaction_id)
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for field, value in payload.model_dump().items():
        setattr(transaction, field, value)
    await db.commit()
    await db.refresh(transaction, ["category"])
    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(transaction_id: int, db: AsyncSession = Depends(get_db)):
    transaction = await db.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.delete(transaction)
    await db.commit()
