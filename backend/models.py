from sqlalchemy import Integer, String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    # "income" or "expense"
    type: Mapped[str] = mapped_column(String(10), nullable=False, server_default="expense")

    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Stored in cents to avoid floating-point errors
    amount_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False)  # ISO 8601: YYYY-MM-DD
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False
    )
    # "income" or "expense"; server_default covers rows created before this column existed
    type: Mapped[str] = mapped_column(String(10), nullable=False, server_default="expense")
    original_currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    original_amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Stored as string to preserve the exact decimal from exchange rate APIs
    exchange_rate: Mapped[str | None] = mapped_column(String(30), nullable=True)

    category: Mapped["Category"] = relationship(back_populates="transactions")
