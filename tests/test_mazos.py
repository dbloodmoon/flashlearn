def test_crear_mazo_normaliza_datos(usuario):
    r = usuario.crear_mazo(nombre="ingles", descripcion="VOCABULARIO")
    assert r.status_code == 200
    body = r.json()
    assert body["nombre"] == "Ingles"
    assert body["descripcion"] == "vocabulario"
    assert body["id"] > 0


def test_crear_mazo_sin_auth(api):
    r = api.crear_mazo()
    assert r.status_code == 401


def test_listar_mazos_vacio(usuario):
    r = usuario.mazos()
    assert r.status_code == 200
    assert r.json() == []


def test_listar_mazos(usuario):
    usuario.crear_mazo(nombre="Ingles")
    usuario.crear_mazo(nombre="Historia")
    r = usuario.mazos()
    assert r.status_code == 200
    assert [m["nombre"] for m in r.json()] == ["Ingles", "Historia"]


def test_crear_mazo_nombre_duplicado(usuario):
    usuario.crear_mazo(nombre="Ingles")
    r = usuario.crear_mazo(nombre="ingles")
    assert r.status_code == 400
    assert r.json()["detail"] == "Ya tienes un mazo registrado con ese nombre"


def test_obtener_mazo_por_id(usuario, mazo_creado):
    r = usuario.mazo(mazo_creado["id"])
    assert r.status_code == 200
    assert r.json()["id"] == mazo_creado["id"]
    assert r.json()["nombre"] == "Ingles"


def test_obtener_mazo_inexistente(usuario):
    r = usuario.mazo(9999)
    assert r.status_code == 404
    assert r.json()["detail"] == "Mazo no encontrado"


def test_mazo_de_otro_usuario(usuario, mazo_creado):
    intruso = usuario.nueva_sesion(username="intruso")
    r = intruso.mazo(mazo_creado["id"])
    assert r.status_code == 404


def test_actualizar_mazo(usuario, mazo_creado):
    r = usuario.actualizar_mazo(mazo_creado["id"], nombre="ciencias", descripcion="NATURALES")
    assert r.status_code == 200
    body = r.json()
    assert body["nombre"] == "Ciencias"
    assert body["descripcion"] == "naturales"


def test_actualizar_mazo_inexistente(usuario):
    r = usuario.actualizar_mazo(9999)
    assert r.status_code == 404


def test_eliminar_mazo(usuario, mazo_creado):
    r = usuario.eliminar_mazo(mazo_creado["id"])
    assert r.status_code == 200
    assert r.json()["id"] == mazo_creado["id"]

    r_lista = usuario.mazos()
    assert r_lista.json() == []


def test_eliminar_mazo_inexistente(usuario):
    r = usuario.eliminar_mazo(9999)
    assert r.status_code == 404


def test_eliminar_mazo_borra_sus_tarjetas(usuario, mazo_creado):
    usuario.crear_tarjeta(mazo_creado["id"])
    usuario.eliminar_mazo(mazo_creado["id"])
    r = usuario.tarjetas_mazo(mazo_creado["id"])
    assert r.status_code == 404