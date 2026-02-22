from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog


async def audit(
    db: AsyncSession,
    user_id: int,
    action: str,
    resource: str,
    resource_id: int | None = None,
    detail: str | None = None,
) -> None:
    """Write an audit log entry. Errors are silently ignored to not break the main flow."""
    try:
        entry = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            detail=detail,
        )
        db.add(entry)
        # Note: caller must commit
    except Exception:
        pass
