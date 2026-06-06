"""FastAPI application factory and router wiring.

⚠️ P4 owns the canonical version of this file (see roles-and-ownership.md).
This is the minimal skeleton that unblocks all four lanes — coordinate with P4
before fleshing out app-wide concerns (lifespan, middleware, error handlers).
"""

from fastapi import FastAPI

from app.routers import meetings, reminders, whatsapp


def create_app() -> FastAPI:
    app = FastAPI(title="Halketon API", version="0.1.0")

    app.include_router(whatsapp.router)
    app.include_router(reminders.router)
    app.include_router(meetings.router)

    @app.get("/health", tags=["meta"])
    def health() -> dict[str, bool]:
        return {"ok": True}

    return app


app = create_app()
