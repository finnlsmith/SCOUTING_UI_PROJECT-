from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.matches import router as matches_router
from routes.system import router as system_router
from routes.visualizations import router as visualizations_router
from routes.players import router as players_router
from routes.technique import router as technique_router
from routes.rows import router as rows_router
from routes.booth import router as booth_router
from routes.holds import router as holds_router
from routes.flip import router as flip_router
from routes.volume import router as volume_router
from routes.timeonball import router as time_router
from routes.free import router as free_router
from routes.touches import router as touches_router
from routes.great import router as great_router
from routes.standard import router as standard_router
from routes.goalside import router as goalside_router
from config.settings import (
    API_TITLE,
    API_DESCRIPTION,
    API_VERSION,
    CORS_ORIGINS,
)

import logging


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


from dotenv import load_dotenv
load_dotenv()

app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Sincere FC Scouting UI",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT",
    },
)


@app.on_event("startup")
async def startup_event():
    """Warm up cache on startup by pre-loading common data"""
    try:
        from cache.core import cache
        from cache.s3_client import s3

        logger.info("🔥 Starting cache warmup...")

        # Warm up matches_df.csv (most frequently accessed)
        try:
            matches_df = s3.get_dataframe(
                "matches_df.csv",
                cache_type="matches_df",
            )
            if matches_df is not None:
                logger.info("✅ Cache warmed: matches_df.csv")
        except Exception as e:
            logger.warning(f"⚠️ Cache warmup failed for matches_df.csv: {e}")

        logger.info("✅ Cache warmup complete")
    except Exception as e:
        logger.warning(f"⚠️ Cache warmup error: {e}")


# Allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(matches_router)
app.include_router(system_router)
app.include_router(visualizations_router)
app.include_router(players_router)
app.include_router(technique_router)
app.include_router(rows_router)
app.include_router(booth_router)
app.include_router(holds_router)
app.include_router(flip_router)
app.include_router(volume_router)
app.include_router(time_router)
app.include_router(free_router)
app.include_router(touches_router)
app.include_router(great_router)
app.include_router(standard_router)
app.include_router(goalside_router)
