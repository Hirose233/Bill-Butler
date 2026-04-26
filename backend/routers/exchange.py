from fastapi import APIRouter, HTTPException, Query
import httpx

router = APIRouter(prefix="/exchange-rates", tags=["exchange-rates"])

_ER_API_URL = "https://open.er-api.com/v6/latest/{base}"


@router.get("/")
async def get_exchange_rates(base: str = Query("CNY")):
    base = base.upper()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(_ER_API_URL.format(base=base))
            resp.raise_for_status()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Exchange rate service timed out")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Exchange rate service returned {exc.response.status_code}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Exchange rate service unreachable: {exc}")

    data = resp.json()
    if data.get("result") != "success":
        raise HTTPException(status_code=502, detail="Exchange rate service returned an error")

    return {"base": base, "rates": data["rates"]}
