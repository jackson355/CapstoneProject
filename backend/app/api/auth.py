from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from datetime import timedelta, datetime
import jwt
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.db.session import get_db
from app.models import User as UserModel, ActivityLog
from app.schemas.user import UserOut  # Assuming your user output schema is here

# Secret key for JWT
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120  # 2 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

auth_router = APIRouter(tags=["authentication"])


class Token(BaseModel):
    access_token: str
    token_type: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db: Session, username: str):
    user = db.query(UserModel).filter(UserModel.email == username).first()
    return user

def authenticate_user(db: Session, username: str, password: str):
    user = get_user(db, username)
    if not user or not verify_password(password, user.password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserOut:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid authentication credentials")

    user = db.query(UserModel).filter(UserModel.email == email).first()
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid authentication credentials")

    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        role_id=user.role_id
    )


@auth_router.post("/token", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        # log login failure (no ip/user_agent as requested)
        db.add(ActivityLog(
            action="auth.login_failure",
            actor_user_id=None,
            target_type="user",
            target_id=user.id if user else None,
            message="Login failed",
            log_metadata=None,
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    # log login success
    db.add(ActivityLog(
        action="auth.login_success",
        actor_user_id=user.id,
        target_type="user",
        target_id=user.id,
        message="User logged in",
        log_metadata=None,
    ))
    db.commit()
    return {"access_token": access_token, "token_type": "bearer"}


@auth_router.get("/users/me", response_model=UserOut)
def read_users_me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@auth_router.post("/change-password")
def change_password(payload: ChangePasswordRequest, current_user: UserOut = Depends(get_current_user), db: Session = Depends(get_db)):
    # Fetch full user model
    user = db.query(UserModel).filter(UserModel.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify current password
    if not verify_password(payload.current_password, user.password):
        # log failed password change
        db.add(ActivityLog(
            action="auth.password_change_failure",
            actor_user_id=current_user.id if current_user else None,
            target_type="user",
            target_id=current_user.id if current_user else None,
            message="Password change failed: incorrect current password",
            log_metadata=None,
        ))
        db.commit()
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    # Update to new hashed password
    user.password = hash_password(payload.new_password)
    db.commit()

    # log success
    db.add(ActivityLog(
        action="auth.password_change_success",
        actor_user_id=current_user.id,
        target_type="user",
        target_id=current_user.id,
        message="Password changed successfully",
        log_metadata=None,
    ))
    db.commit()
    return {"detail": "Password updated successfully"}


@auth_router.post("/logout")
def logout():
    # Since JWT is stateless, you can't truly invalidate it unless you maintain a token blacklist
    # This just responds for now
    return {"message": "User logged out successfully"}
