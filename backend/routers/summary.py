from typing import Literal, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from database import get_db
from models import Category, Transaction
from schemas import CategorySummaryItem, CategorySummaryRead, SummaryRead, TimeSeriesItem

router = APIRouter(prefix="/summary", tags=["summary"])


def _apply_date_filters(stmt, start_date: Optional[str], end_date: Optional[str]):
    if start_date is not None:
        stmt = stmt.where(Transaction.date >= start_date)
    if end_date is not None:
        stmt = stmt.where(Transaction.date <= end_date)
    return stmt


@router.get("/", response_model=SummaryRead)
async def get_summary(
    start_date: Optional[str] = Query(None, description="Start date inclusive (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date inclusive (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    income_stmt = _apply_date_filters(
        select(func.sum(Transaction.amount_cents)).where(Transaction.type == "income"),
        start_date, end_date,
    )
    expense_stmt = _apply_date_filters(
        select(func.sum(Transaction.amount_cents)).where(Transaction.type == "expense"),
        start_date, end_date,
    )
    count_stmt = _apply_date_filters(
        select(func.count(Transaction.id)),
        start_date, end_date,
    )

    total_income = (await db.execute(income_stmt)).scalar() or 0
    total_expense = (await db.execute(expense_stmt)).scalar() or 0
    transaction_count = (await db.execute(count_stmt)).scalar() or 0

    return SummaryRead(
        total_income_cents=total_income,
        total_expense_cents=total_expense,
        net_balance_cents=total_income - total_expense,
        transaction_count=transaction_count,
    )


@router.get("/by-category", response_model=CategorySummaryRead)
async def get_summary_by_category(
    start_date: Optional[str] = Query(None, description="Start date inclusive (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date inclusive (YYYY-MM-DD)"),
    transaction_type: Optional[Literal["income", "expense"]] = Query(None, alias="type"),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(
            Transaction.category_id,
            Category.name.label("category_name"),
            func.sum(Transaction.amount_cents).label("total_amount_cents"),
            func.count(Transaction.id).label("transaction_count"),
        )
        .join(Category, Transaction.category_id == Category.id)
        .group_by(Transaction.category_id, Category.name)
        .order_by(func.sum(Transaction.amount_cents).desc())
    )
    if transaction_type is not None:
        stmt = stmt.where(Transaction.type == transaction_type)
    stmt = _apply_date_filters(stmt, start_date, end_date)

    rows = (await db.execute(stmt)).all()
    grand_total = sum(row.total_amount_cents for row in rows)

    items = [
        CategorySummaryItem(
            category_id=row.category_id,
            category_name=row.category_name,
            total_amount_cents=row.total_amount_cents,
            transaction_count=row.transaction_count,
            percentage=round((row.total_amount_cents / grand_total) * 100, 2) if grand_total > 0 else 0.0,
        )
        for row in rows
    ]

    return CategorySummaryRead(items=items, total_amount_cents=grand_total)


def _time_series_stmt(fmt: str, start_date: Optional[str], end_date: Optional[str]):
    stmt = (
        select(
            func.strftime(fmt, Transaction.date).label("period"),
            func.sum(
                case((Transaction.type == "income", Transaction.amount_cents), else_=0)
            ).label("income_cents"),
            func.sum(
                case((Transaction.type == "expense", Transaction.amount_cents), else_=0)
            ).label("expense_cents"),
        )
        .group_by("period")
        .order_by("period")
    )
    return _apply_date_filters(stmt, start_date, end_date)


@router.get("/by-month", response_model=list[TimeSeriesItem])
async def get_summary_by_month(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(_time_series_stmt("%Y-%m", start_date, end_date))).all()
    return [
        TimeSeriesItem(
            period=r.period,
            income_cents=r.income_cents or 0,
            expense_cents=r.expense_cents or 0,
            net_cents=(r.income_cents or 0) - (r.expense_cents or 0),
        )
        for r in rows
    ]


@router.get("/by-day", response_model=list[TimeSeriesItem])
async def get_summary_by_day(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(_time_series_stmt("%Y-%m-%d", start_date, end_date))).all()
    return [
        TimeSeriesItem(
            period=r.period,
            income_cents=r.income_cents or 0,
            expense_cents=r.expense_cents or 0,
            net_cents=(r.income_cents or 0) - (r.expense_cents or 0),
        )
        for r in rows
    ]
