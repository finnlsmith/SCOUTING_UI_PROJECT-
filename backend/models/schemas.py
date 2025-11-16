from typing import Optional, Dict, Any
from pydantic import BaseModel

class ClientErrorPayload(BaseModel):
    message: str
    stack: Optional[str] = None
    componentStack: Optional[str] = None
    url: Optional[str] = None
    userAgent: Optional[str] = None
    time: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"  # don't break if frontend sends extra fields