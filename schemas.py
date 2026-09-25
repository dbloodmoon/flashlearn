from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, timedelta

class MazoBase(BaseModel):
    nombre: str
    descripcion: str

class MazoCreate(MazoBase):
    pass

class MazoResponse(MazoBase):
    id: int
    nombre: str
    descripcion: str
    
    model_config = ConfigDict(from_attributes=True)

class UsuarioBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=25)

class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=6, max_length=120)

class UsuarioResponse(UsuarioBase):
    id: int
    rol: str
    mazos: list[MazoResponse] = []

    model_config = ConfigDict(from_attributes=True)

class TarjetaBase(BaseModel):
    pregunta: str = Field(..., min_length=1, max_length=255)
    respuesta: str = Field(..., min_length=1, max_length=255)
    mazo_id: int
    proxima_revision: datetime = Field(default_factory=lambda: datetime.now() + timedelta(days=1))
    intervalo_dias: int = Field(default=1)
    facilidad: float = Field(default=2.5)
    veces_revisada: int = Field(default=0)

class TarjetaCreate(BaseModel):
    pregunta: str = Field(..., min_length=1, max_length=255)
    respuesta: str = Field(..., min_length=1, max_length=255)
    mazo_id: int

class TarjetaResponse(TarjetaBase):
    id: int
    mazo: MazoResponse
    
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str

class TarjetaUpdate(BaseModel):
    pregunta: Optional[str] = Field(None, min_length=1, max_length=255)
    respuesta: Optional[str] = Field(None, min_length=1, max_length=255)

class RepasarRequest(BaseModel):
    calificacion: int = Field(..., ge=0, le=5)