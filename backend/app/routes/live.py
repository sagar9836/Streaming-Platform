from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/live", tags=["Live"])


@router.api_route("/{path:path}", methods=["GET", "POST", "PATCH", "DELETE"])
async def live_removed(path: str):
    raise HTTPException(410, "Live streaming has been removed from this VOD platform")
