import jwt
from datetime import datetime, timedelta, timezone

from auth import SECRET_KEY, ALGORITHM


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/html")
    assert "Flashlearn" in r.text


def test_registrar_usuario(api):
    r = api.registrar()
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "daniel"
    assert body["rol"] == "normal"
    assert body["mazos"] == []
    assert "password" not in body
    assert "hashed_password" not in body


def test_registrar_usuario_repetido(api):
    api.registrar()
    r = api.registrar()
    assert r.status_code == 400
    assert r.json()["detail"] == "El usuario ya existe"


def test_registrar_usuario_username_invalido(api):
    r = api.registrar(username="ab")
    assert r.status_code == 422


def test_registrar_usuario_password_corta(api):
    r = api.registrar(password="12345")
    assert r.status_code == 422


def test_login_correcto(api):
    api.registrar()
    r = api.login()
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_password_incorrecta(api):
    api.registrar()
    r = api.login(password="incorrecta1")
    assert r.status_code == 401
    assert r.json()["detail"] == "Credenciales incorrectas"


def test_login_usuario_inexistente(api):
    r = api.login()
    assert r.status_code == 401


def test_leer_yo_autenticado(api):
    api.crear_usuario()
    r = api.yo()
    assert r.status_code == 200
    assert r.json()["username"] == "daniel"


def test_leer_yo_sin_token(api):
    r = api.yo()
    assert r.status_code == 401


def test_leer_yo_token_invalido(client):
    r = client.get(
        "/usuarios/yo", headers={"Authorization": "Bearer token-no-valido"}
    )
    assert r.status_code == 401


def test_leer_yo_token_expirado(client):
    token = jwt.encode(
        {
            "sub": "daniel",
            "usuario_id": 1,
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    r = client.get("/usuarios/yo", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Token expirado"


def test_leer_yo_token_firma_invalida(client):
    token = jwt.encode(
        {
            "sub": "daniel",
            "usuario_id": 1,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        },
        "otra_clave_distinta",
        algorithm=ALGORITHM,
    )
    r = client.get("/usuarios/yo", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Token inválido"


def test_leer_yo_token_usuario_inexistente(client):
    token = jwt.encode(
        {
            "sub": "fantasma",
            "usuario_id": 9999,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )
    r = client.get("/usuarios/yo", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_eliminar_usuario(usuario):
    r = usuario.eliminar_usuario()
    assert r.status_code == 200
    assert r.json() == {"detail": "Usuario eliminado"}

    r_usuario = usuario.yo()
    assert r_usuario.status_code == 401


def test_eliminar_usuario_sin_token(api):
    r = api.eliminar_usuario()
    assert r.status_code == 401