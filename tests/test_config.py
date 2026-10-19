from config import Settings


def construir(database_url):
    return Settings(
        secret_key="test",
        algorithm="HS256",
        access_token_expire_minutes=30,
        database_url=database_url,
    )


def test_url_plana_usa_psycopg2():
    s = construir("postgresql://u:p@host:5432/db")
    assert s.database_url == "postgresql+psycopg2://u:p@host:5432/db"


def test_url_psycopg3_usa_psycopg2():
    s = construir("postgresql+psycopg://u:p@host:5432/db")
    assert s.database_url == "postgresql+psycopg2://u:p@host:5432/db"


def test_url_sqlite_queda_intacta():
    s = construir("sqlite:///./flashlearn.db")
    assert s.database_url == "sqlite:///./flashlearn.db"
