from fastapi import FastAPI
from app.api.routes import health

app = FastAPI(title="TrustLevel Review Tool API")

app.include_router(health.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Welcome to TrustLevel Review Tool API"}