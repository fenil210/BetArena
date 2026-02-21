"""
Seed script — creates the initial admin user and optionally sample users.
Run this once after the database is created.

Usage:
    python -m app.seed
"""

from app.database import SessionLocal, init_db
from app.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    init_db()
    db = SessionLocal()

    # Check if admin already exists
    admin = db.query(User).filter(User.username == "admin").first()
    if admin:
        print("Admin user already exists. Skipping seed.")
        db.close()
        return

    # Create admin
    admin = User(
        username="admin",
        email="admin@mailinator.com",
        password_hash=pwd_context.hash("admin@123"),
        balance=999999,
        is_admin=True,
    )
    db.add(admin)

    # Create sample users
    sample_users = [
    ("praxal", "praxal@mailinator.com", "praxal@123"),
    ("raj", "raj@mailinator.com", "raj@123"),
    ("dhruv", "dhruv@mailinator.com", "dhruv@123"),
    ("darshan", "darshan@mailinator.com", "darshan@123"),
    ("kavya", "kavya@mailinator.com", "kavya@123"),
    ("pranshav", "pranshav@mailinator.com", "pranshav@123"),
    ("fenilR", "fenilR@mailinator.com", "fenilR@123"),
    ("fenilK", "fenilK@mailinator.com", "fenilK@123"),
    ]

    for username, email, password in sample_users:
        user = User(
            username=username,
            email=email,
            password_hash=pwd_context.hash(password),
            balance=1000,
            is_admin=False,
        )
        db.add(user)

    db.commit()
    db.close()
    print("Seed complete: 1 admin + 8 users created.")
    print("Admin login: admin@mailinator.com / admin@123")


if __name__ == "__main__":
    seed()
