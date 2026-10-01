import pytest
import pytest_asyncio
from app.core.database import engine, Base, AsyncSessionLocal
from app.services.seed_service import seed_initial_data
import app.models

@pytest_asyncio.fixture(scope="session", autouse=True)
async def init_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)
        
    yield
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
