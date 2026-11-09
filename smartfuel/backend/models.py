from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, description="Full Name")
    email: str = Field(..., description="User Email")
    password: str = Field(..., min_length=6, description="Password (min 6 chars, alphanumeric)")
    phone: Optional[str] = Field(None, description="Phone number")
    role: str = Field("customer", description="Role: customer or manager")
    # Station Manager specific fields (SRS FR-A1, FR-A2)
    station_name: Optional[str] = None
    station_address: Optional[str] = None
    license_no: Optional[str] = None
    latitude: Optional[float] = 23.7500
    longitude: Optional[float] = 90.3800

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateInventoryRequest(BaseModel):
    station_id: int
    grade_id: int
    current_litres: float = Field(..., ge=0, description="Available litres in stock")

class RecordSaleRequest(BaseModel):
    station_id: int
    grade_id: int
    litres_sold: float = Field(..., gt=0, description="Litres sold (must be > 0)")
    period_start: Optional[str] = None
    period_end: Optional[str] = None

class VerifyStationRequest(BaseModel):
    station_id: int
    status: str = Field(..., description="verified, pending, or rejected")

class UpdatePriceRequest(BaseModel):
    grade_id: int
    new_price: float = Field(..., ge=0, description="Official price per litre")
