from datetime import datetime, timedelta

from main import aplicar_sm2
from models import Tarjeta


def tarjeta(nombre="hola"):
    return Tarjeta(
        pregunta=nombre,
        respuesta="hello",
        mazo_id=1,
        proxima_revision=datetime.now() + timedelta(days=1),
        intervalo_dias=1,
        facilidad=2.5,
        veces_revisada=0,
    )


def test_primera_revision_aprobada():
    resultado = aplicar_sm2(tarjeta(), 5)
    assert resultado.veces_revisada == 1
    assert resultado.intervalo_dias == 1
    assert resultado.facilidad == 2.6
    assert resultado.proxima_revision > datetime.now()


def test_segunda_revision_aprobada():
    t = tarjeta()
    aplicar_sm2(t, 5)
    resultado = aplicar_sm2(t, 5)
    assert resultado.veces_revisada == 2
    assert resultado.intervalo_dias == 6


def test_tercera_revision_multiplica_intervalo():
    t = tarjeta()
    aplicar_sm2(t, 5)
    aplicar_sm2(t, 5)
    t.intervalo_dias = 6
    t.facilidad = 2.6
    resultado = aplicar_sm2(t, 4)
    assert resultado.veces_revisada == 3
    assert resultado.intervalo_dias == round(6 * 2.6)


def test_revision_reprobada_resetea():
    t = tarjeta()
    aplicar_sm2(t, 5)
    t.veces_revisada = 3
    t.intervalo_dias = 12
    resultado = aplicar_sm2(t, 1)
    assert resultado.veces_revisada == 0
    assert resultado.intervalo_dias == 1


def test_revision_reprobada_baja_facilidad():
    resultado = aplicar_sm2(tarjeta(), 1)
    assert resultado.facilidad < 2.5


def test_facilidad_no_baja_de_1_3():
    t = tarjeta()
    for _ in range(20):
        aplicar_sm2(t, 0)
    assert t.facilidad >= 1.3


def test_calificacion_3_aumenta_intervalo():
    t = tarjeta()
    aplicar_sm2(t, 3)
    assert t.veces_revisada == 1
    assert t.intervalo_dias == 1