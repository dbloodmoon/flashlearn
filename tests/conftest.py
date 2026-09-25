import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main as main_module
from database import Base


@pytest.fixture()
def engine():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=test_engine)
    yield test_engine
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


@pytest.fixture()
def db_session(engine):
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    yield session
    session.close()


@pytest.fixture()
def client(engine):
    TestingSession = sessionmaker(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    main_module.app.dependency_overrides[main_module.get_db] = override_get_db
    with TestClient(main_module.app) as test_client:
        yield test_client
    main_module.app.dependency_overrides.clear()


class Api:
    def __init__(self, test_client):
        self.c = test_client
        self.token = None

    def headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def registrar(self, username="daniel", password="secreto123"):
        return self.c.post(
            "/usuarios/registrar",
            json={"username": username, "password": password},
        )

    def login(self, username="daniel", password="secreto123"):
        r = self.c.post(
            "/usuarios/login",
            data={"username": username, "password": password},
        )
        if r.status_code == 200:
            self.token = r.json()["access_token"]
        return r

    def crear_usuario(self, username="daniel", password="secreto123"):
        self.registrar(username=username, password=password)
        return self.login(username=username, password=password)

    def nueva_sesion(self, username, password="secreto456"):
        otro = Api(self.c)
        otro.crear_usuario(username=username, password=password)
        return otro

    def yo(self):
        return self.c.get("/usuarios/yo", headers=self.headers())

    def eliminar_usuario(self):
        return self.c.delete("/usuarios/yo", headers=self.headers())

    def crear_mazo(self, nombre="Ingles", descripcion="VOCABULARIO"):
        return self.c.post(
            "/mazos",
            json={"nombre": nombre, "descripcion": descripcion},
            headers=self.headers(),
        )

    def mazos(self):
        return self.c.get("/mazos", headers=self.headers())

    def mazo(self, mazo_id):
        return self.c.get(f"/mazo/{mazo_id}", headers=self.headers())

    def actualizar_mazo(self, mazo_id, nombre="Otro", descripcion="otra"):
        return self.c.put(
            f"/mazo/{mazo_id}",
            json={"nombre": nombre, "descripcion": descripcion},
            headers=self.headers(),
        )

    def eliminar_mazo(self, mazo_id):
        return self.c.delete(f"/mazo/{mazo_id}", headers=self.headers())

    def crear_tarjeta(self, mazo_id, pregunta="HOLA", respuesta="HELLO"):
        return self.c.post(
            "/mazos/tarjetas",
            json={"pregunta": pregunta, "respuesta": respuesta, "mazo_id": mazo_id},
            headers=self.headers(),
        )

    def tarjetas_mazo(self, mazo_id):
        return self.c.get(f"/mazo/{mazo_id}/tarjetas", headers=self.headers())

    def tarjetas_repasar(self):
        return self.c.get("/tarjetas/repasar", headers=self.headers())

    def actualizar_tarjeta(self, tarjeta_id, pregunta=None, respuesta=None):
        body = {}
        if pregunta is not None:
            body["pregunta"] = pregunta
        if respuesta is not None:
            body["respuesta"] = respuesta
        return self.c.put(
            f"/tarjeta/{tarjeta_id}",
            json=body,
            headers=self.headers(),
        )

    def eliminar_tarjeta(self, tarjeta_id):
        return self.c.delete(f"/tarjeta/{tarjeta_id}", headers=self.headers())

    def repasar(self, tarjeta_id, calificacion):
        return self.c.post(
            f"/tarjeta/{tarjeta_id}/repasar",
            json={"calificacion": calificacion},
            headers=self.headers(),
        )


@pytest.fixture()
def api(client):
    return Api(client)


@pytest.fixture()
def usuario(api):
    api.crear_usuario()
    return api


@pytest.fixture()
def mazo_creado(usuario):
    return usuario.crear_mazo().json()


@pytest.fixture()
def tarjeta_creada(usuario, mazo_creado):
    return usuario.crear_tarjeta(mazo_creado["id"]).json()