from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from models import Usuario, Tarjeta, Mazo
from schemas import (UsuarioResponse, TarjetaResponse, MazoResponse, UsuarioCreate,
                     TarjetaCreate, MazoCreate, TarjetaUpdate, RepasarRequest)
from auth import get_db, crear_token_acceso, verificar_password, generar_hash, obtener_usuario_actual
from database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Flashlearn - API", version="0.0.1")

def aplicar_sm2(tarjeta: Tarjeta, calificacion: int) -> Tarjeta:
    tarjeta.facilidad = max(1.3, tarjeta.facilidad + 0.1 - (5 - calificacion) * (0.08 + (5 - calificacion) * 0.02))

    if calificacion >= 3:
        if tarjeta.veces_revisada == 0:
            tarjeta.intervalo_dias = 1
        elif tarjeta.veces_revisada == 1:
            tarjeta.intervalo_dias = 6
        else:
            tarjeta.intervalo_dias = round(tarjeta.intervalo_dias * tarjeta.facilidad)
        tarjeta.veces_revisada += 1
    else:
        tarjeta.veces_revisada = 0
        tarjeta.intervalo_dias = 1

    tarjeta.proxima_revision = datetime.now() + timedelta(days=tarjeta.intervalo_dias)
    return tarjeta

@app.get("/")
def read_root():
    return {"message": "Bienvenido a Flashlearn"}

@app.post("/usuarios/registrar", response_model=UsuarioResponse)
def registrar_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    usuario_existe = db.query(Usuario).filter(Usuario.username == usuario.username).first()

    if usuario_existe:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    
    nuevo_usuario = Usuario(
        username=usuario.username, 
        hashed_password=generar_hash(usuario.password)
    )

    try:
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno")

@app.get("/usuarios/yo", response_model=UsuarioResponse)
def leer_usuario(usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    return usuario_actual

@app.post("/usuarios/login")
def login(db: Session = Depends(get_db), pwd: OAuth2PasswordRequestForm = Depends()):

    usuario = db.query(Usuario).filter(Usuario.username == pwd.username).first()
    if not usuario or not verificar_password(pwd.password, usuario.hashed_password):
        raise HTTPException(
            status_code=401, 
            detail="Credenciales incorrectas", 
            headers={"WWW-Authenticate": "Bearer"}
            )

    try:
        token = crear_token_acceso({"sub": usuario.username, "usuario_id": usuario.id})
        return {"access_token": token, "token_type": "bearer"}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@app.get("/mazos", response_model=list[MazoResponse])
def leer_mazos(db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    mazos = db.query(Mazo).filter(Mazo.usuario_id == usuario_actual.id).all()
    return mazos

@app.post("/mazos", response_model=MazoResponse)
def crear_mazo(mazo: MazoCreate, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    
    nuevo_mazo = Mazo(
        nombre=mazo.nombre.capitalize(),
        descripcion=mazo.descripcion.lower(),
        usuario_id=usuario_actual.id
    )
    try:

        db.add(nuevo_mazo)
        db.commit()
        db.refresh(nuevo_mazo)
        return nuevo_mazo
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Ya tienes un mazo registrado con ese nombre")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@app.get("/mazo/{id}", response_model=MazoResponse)
def obtener_mazo_unico(id: int, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):

    mazo = db.query(Mazo).filter(Mazo.id == id, Mazo.usuario_id == usuario_actual.id).first()
    if not mazo:
        raise HTTPException(status_code=404, detail="Mazo no encontrado")

    return mazo

@app.delete("/mazo/{id}", response_model=MazoResponse)
def eliminar_mazo(id: int, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    mazo = db.query(Mazo).filter(Mazo.id == id, Mazo.usuario_id == usuario_actual.id).first()
    if not mazo:
        raise HTTPException(status_code=404, detail="Mazo no encontrado")

    db.delete(mazo)
    db.commit()

    return mazo

@app.put("/mazo/{id}", response_model=MazoResponse)
def actualizar_mazo(id: int, mazo_data: MazoCreate, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    mazo = db.query(Mazo).filter(Mazo.id == id, Mazo.usuario_id == usuario_actual.id).first()
    if not mazo:
        raise HTTPException(status_code=404, detail="Mazo no encontrado")

    mazo.nombre = mazo_data.nombre.capitalize()
    mazo.descripcion = mazo_data.descripcion.lower()
    db.commit()
    db.refresh(mazo)

    return mazo

@app.post("/mazos/tarjetas", response_model=TarjetaResponse)
def crear_tarjeta(tarjeta: TarjetaCreate, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    
    mazo = db.query(Mazo).filter(Mazo.id == tarjeta.mazo_id, Mazo.usuario_id == usuario_actual.id).first()
    if not mazo:
        raise HTTPException(status_code=404, detail="Mazo no encontrado")
    
    nueva_tarjeta = Tarjeta(
        pregunta=tarjeta.pregunta.lower(),
        respuesta=tarjeta.respuesta.lower(),
        mazo_id=tarjeta.mazo_id
    )
    
    try:
        db.add(nueva_tarjeta)
        db.commit()
        db.refresh(nueva_tarjeta)
        return nueva_tarjeta
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    

@app.get("/tarjetas/repasar", response_model=list[TarjetaResponse])
def leer_tarjetas(db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    tarjeta = (
        db.query(Tarjeta)
        .join(Mazo, Tarjeta.mazo_id == Mazo.id)
        .filter(
            Mazo.usuario_id == usuario_actual.id,
            Tarjeta.proxima_revision <= datetime.now()
        )
        .order_by(Tarjeta.proxima_revision.asc())
        .all()
    )

    return tarjeta

@app.get("/mazo/{id}/tarjetas", response_model=list[TarjetaResponse])
def leer_tarjetas_del_mazo(id: int, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    mazo = db.query(Mazo).filter(Mazo.id == id, Mazo.usuario_id == usuario_actual.id).first()
    if not mazo:
        raise HTTPException(status_code=404, detail="Mazo no encontrado")

    return mazo.tarjetas

@app.put("/tarjeta/{id}", response_model=TarjetaResponse)
def actualizar_tarjeta(id: int, tarjeta_data: TarjetaUpdate, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    tarjeta = db.query(Tarjeta).join(Mazo).filter(Tarjeta.id == id, Mazo.usuario_id == usuario_actual.id).first()
    if not tarjeta:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")

    if tarjeta_data.pregunta is not None:
        tarjeta.pregunta = tarjeta_data.pregunta
    if tarjeta_data.respuesta is not None:
        tarjeta.respuesta = tarjeta_data.respuesta

    db.commit()
    db.refresh(tarjeta)
    return tarjeta

@app.delete("/tarjeta/{id}")
def eliminar_tarjeta(id: int, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    tarjeta = db.query(Tarjeta).join(Mazo).filter(Tarjeta.id == id, Mazo.usuario_id == usuario_actual.id).first()
    if not tarjeta:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")

    db.delete(tarjeta)
    db.commit()
    return {"detail": "Tarjeta eliminada"}

@app.post("/tarjeta/{id}/repasar", response_model=TarjetaResponse)
def repasar_tarjeta(id: int, review: RepasarRequest, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    tarjeta = db.query(Tarjeta).join(Mazo).filter(Tarjeta.id == id, Mazo.usuario_id == usuario_actual.id).first()
    if not tarjeta:
        raise HTTPException(status_code=404, detail="Tarjeta no encontrada")

    aplicar_sm2(tarjeta, review.calificacion)
    db.commit()
    db.refresh(tarjeta)
    return tarjeta

@app.delete("/usuarios/yo")
def eliminar_usuario(db: Session = Depends(get_db), usuario_actual: Usuario = Depends(obtener_usuario_actual)):
    db.delete(usuario_actual)
    db.commit()
    return {"detail": "Usuario eliminado"}    
    
    
