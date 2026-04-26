from typing import Literal, Optional
from pydantic import BaseModel, field_validator


# ---------- Category ----------

class CategoryBase(BaseModel):
    name: str
    type: Literal["income", "expense"] = "expense"


class CategoryCreate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    id: int

    model_config = {"from_attributes": True}


# ---------- Transaction ----------

class TransactionBase(BaseModel):
    description: Optional[str] = None
    amount_cents: int
    date: str  # YYYY-MM-DD
    category_id: int
    type: Literal["income", "expense"]
    original_currency: Optional[str] = None
    original_amount_cents: Optional[int] = None
    exchange_rate: Optional[str] = None

    @field_validator("amount_cents")
    @classmethod
    def amount_must_be_nonzero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("amount_cents must not be zero")
        return v

    @field_validator("original_currency")
    @classmethod
    def currency_must_be_iso(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) != 3:
            raise ValueError("original_currency must be a 3-character ISO 4217 code")
        return v.upper() if v else v


class TransactionCreate(TransactionBase):
    pass


class TransactionRead(TransactionBase):
    id: int
    category: CategoryRead

    model_config = {"from_attributes": True}


# ---------- Summary ----------

class SummaryRead(BaseModel):
    total_income_cents: int
    total_expense_cents: int
    net_balance_cents: int
    transaction_count: int


class CategorySummaryItem(BaseModel):
    category_id: int
    category_name: str
    total_amount_cents: int
    transaction_count: int
    percentage: float


class CategorySummaryRead(BaseModel):
    items: list[CategorySummaryItem]
    total_amount_cents: int


# ---------- Time-series ----------

class TimeSeriesItem(BaseModel):
    period: str          # "YYYY-MM" for monthly, "YYYY-MM-DD" for daily
    income_cents: int
    expense_cents: int
    net_cents: int
