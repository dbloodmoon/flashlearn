from sqlalchemy import UniqueConstraint
from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(String(15), default="normal")

    mazos = relationship("Mazo", back_populates="usuario", cascade="all, delete-orphan")

class Mazo(Base):
    __tablename__ = "mazos"

    id = Column(Integer, primary_key=True)
    nombre = Column(String(50), nullable=False)
    descripcion = Column(String(255), nullable=False, default="")
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    usuario = relationship("Usuario", back_populates="mazos")
    tarjetas = relationship("Tarjeta", back_populates="mazo", cascade="all, delete-orphan")

    __table_args__= (
        UniqueConstraint("nombre", "usuario_id", name="uq_usuario_mazo_nombre"),
    )

class Tarjeta(Base):
    __tablename__ = "tarjetas"

    id = Column(Integer, primary_key=True)
    pregunta = Column(String(255), nullable=False)
    respuesta = Column(String(255), nullable=False)
    mazo_id = Column(Integer, ForeignKey("mazos.id"), nullable=False)
    proxima_revision = Column(DateTime, default=lambda: datetime.now() + timedelta(days=1), nullable=False)
    intervalo_dias = Column(Integer, default=1, nullable=False)
    facilidad = Column(Float, default=2.5, nullable=False)
    veces_revisada = Column(Integer, default=0, nullable=False)

    mazo = relationship("Mazo", back_populates="tarjetas")