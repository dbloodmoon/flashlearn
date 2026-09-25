from click import argument
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings

argumentos = {}

if settings.database_url.startswith("sqlite"):
    argumentos["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **argumentos)

SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass