from datetime import datetime, timedelta

from conftest import Api
from models import Tarjeta


def test_crear_tarjeta_normaliza_datos(usuario, mazo_creado):
    r = usuario.crear_tarjeta(mazo_creado["id"], pregunta="HOLA", respuesta="HELLO")
    assert r.status_code == 200
    body = r.json()
    assert body["pregunta"] == "hola"
    assert body["respuesta"] == "hello"
    assert body["mazo"]["id"] == mazo_creado["id"]
    assert body["intervalo_dias"] == 1
    assert body["facilidad"] == 2.5
    assert body["veces_revisada"] == 0


def test_crear_tarjeta_sin_auth(client, mazo_creado):
    anonimo = Api(client)
    r = anonimo.crear_tarjeta(mazo_creado["id"])
    assert r.status_code == 401


def test_crear_tarjeta_mazo_inexistente(usuario):
    r = usuario.crear_tarjeta(9999)
    assert r.status_code == 404
    assert r.json()["detail"] == "Mazo no encontrado"


def test_crear_tarjeta_mazo_ajeno(mazo_creado, usuario):
    intruso = usuario.nueva_sesion(username="intruso")
    r = intruso.crear_tarjeta(mazo_creado["id"])
    assert r.status_code == 404


def test_listar_tarjetas_del_mazo(usuario, mazo_creado):
    usuario.crear_tarjeta(mazo_creado["id"], pregunta="hola", respuesta="hello")
    usuario.crear_tarjeta(mazo_creado["id"], pregunta="adios", respuesta="bye")
    r = usuario.tarjetas_mazo(mazo_creado["id"])
    assert r.status_code == 200
    assert [t["pregunta"] for t in r.json()] == ["hola", "adios"]


def test_listar_tarjetas_mazo_inexistente(usuario):
    r = usuario.tarjetas_mazo(9999)
    assert r.status_code == 404


def test_actualizar_tarjeta(usuario, tarjeta_creada):
    r = usuario.actualizar_tarjeta(
        tarjeta_creada["id"], respuesta="HELLO WORLD"
    )
    assert r.status_code == 200
    assert r.json()["respuesta"] == "HELLO WORLD"
    assert r.json()["pregunta"] == tarjeta_creada["pregunta"]


def test_actualizar_tarjeta_inexistente(usuario):
    r = usuario.actualizar_tarjeta(9999, respuesta="x")
    assert r.status_code == 404
    assert r.json()["detail"] == "Tarjeta no encontrada"


def test_eliminar_tarjeta(usuario, tarjeta_creada):
    r = usuario.eliminar_tarjeta(tarjeta_creada["id"])
    assert r.status_code == 200
    assert r.json() == {"detail": "Tarjeta eliminada"}

    r_otra = usuario.eliminar_tarjeta(tarjeta_creada["id"])
    assert r_otra.status_code == 404


def test_eliminar_tarjeta_inexistente(usuario):
    r = usuario.eliminar_tarjeta(9999)
    assert r.status_code == 404


def test_repasar_tarjeta(usuario, tarjeta_creada):
    r = usuario.repasar(tarjeta_creada["id"], calificacion=5)
    assert r.status_code == 200
    body = r.json()
    assert body["veces_revisada"] == 1
    assert body["intervalo_dias"] == 1
    assert body["facilidad"] == 2.6


def test_repasar_calificacion_invalida(usuario, tarjeta_creada):
    r = usuario.repasar(tarjeta_creada["id"], calificacion=6)
    assert r.status_code == 422

    r_baja = usuario.repasar(tarjeta_creada["id"], calificacion=-1)
    assert r_baja.status_code == 422


def test_repasar_tarjeta_inexistente(usuario):
    r = usuario.repasar(9999, calificacion=4)
    assert r.status_code == 404


def test_tarjetas_para_repasar_solo_las_vencidas(usuario, mazo_creado, db_session):
    vencida = usuario.crear_tarjeta(mazo_creado["id"], pregunta="hola").json()
    futura = usuario.crear_tarjeta(mazo_creado["id"], pregunta="adios").json()

    tarjeta_obj = db_session.get(Tarjeta, vencida["id"])
    tarjeta_obj.proxima_revision = datetime.now() - timedelta(days=1)
    db_session.add(tarjeta_obj)

    tarjeta_futura = db_session.get(Tarjeta, futura["id"])
    tarjeta_futura.proxima_revision = datetime.now() + timedelta(days=5)
    db_session.add(tarjeta_futura)
    db_session.commit()

    r = usuario.tarjetas_repasar()
    assert r.status_code == 200
    assert [t["id"] for t in r.json()] == [vencida["id"]]


def test_tarjetas_repasar_no_mezcla_usuarios(usuario, mazo_creado, db_session):
    vencida = usuario.crear_tarjeta(mazo_creado["id"], pregunta="hola").json()
    tarjeta_obj = db_session.get(Tarjeta, vencida["id"])
    tarjeta_obj.proxima_revision = datetime.now() - timedelta(days=1)
    db_session.commit()

    intruso = usuario.nueva_sesion(username="intruso")
    r = intruso.tarjetas_repasar()
    assert r.status_code == 200
    assert r.json() == []