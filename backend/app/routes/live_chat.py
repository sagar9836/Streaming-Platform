from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/live/chat", tags=["Live Chat"])


@router.api_route("/{path:path}", methods=["GET", "POST"])
async def live_chat_removed(path: str):
    raise HTTPException(410, "Live chat has been removed from this VOD platform")
