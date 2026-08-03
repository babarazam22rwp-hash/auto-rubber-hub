from __future__ import annotations

import os
import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation
from functools import wraps
from pathlib import Path
from typing import Any, Callable

from dotenv import load_dotenv
from flask import (
    Flask,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    session,
    url_for,
)
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.datastructures import FileStorage
from werkzeug.security import safe_join
from werkzeug.utils import secure_filename


load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "static" / "uploads"

ALLOWED_IMAGE_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp",
}

ORDER_STATUSES = {
    "pending",
    "processing",
    "dispatched",
    "delivered",
    "cancelled",
}

REQUEST_STATUSES = {
    "received",
    "searching",
    "available",
    "quoted",
    "dispatched",
    "completed",
    "cancelled",
}


app = Flask(__name__, instance_relative_config=True)

app.config.update(
    SECRET_KEY=os.getenv(
        "SECRET_KEY",
        "development-secret-key-change-before-deployment",
    ),
    SQLALCHEMY_DATABASE_URI=os.getenv(
        "DATABASE_URL",
        f"sqlite:///{Path(app.instance_path) / 'auto_rubber_hub.db'}",
    ),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    UPLOAD_FOLDER=str(UPLOAD_FOLDER),
    MAX_CONTENT_LENGTH=5 * 1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)

Path(app.instance_path).mkdir(parents=True, exist_ok=True)
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

db = SQLAlchemy(app)


# ============================================================
# Database models
# ============================================================

class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(
        db.String(180),
        nullable=False,
    )

    category = db.Column(
        db.String(80),
        nullable=False,
        index=True,
    )

    compatibility = db.Column(
        db.String(250),
        nullable=False,
    )

    description = db.Column(
        db.Text,
        nullable=False,
    )

    price = db.Column(
        db.Numeric(10, 2),
        nullable=False,
    )

    old_price = db.Column(
        db.Numeric(10, 2),
        nullable=True,
    )

    stock = db.Column(
        db.Integer,
        nullable=False,
        default=0,
    )

    active = db.Column(
        db.Boolean,
        nullable=False,
        default=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    order_items = db.relationship(
        "OrderItem",
        back_populates="product",
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "compatibility": self.compatibility,
            "description": self.description,
            "price": float(self.price),
            "oldPrice": (
                float(self.old_price)
                if self.old_price is not None
                else None
            ),
            "stock": self.stock,
            "active": self.active,
        }


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    order_number = db.Column(
        db.String(40),
        unique=True,
        nullable=False,
        index=True,
    )

    customer_name = db.Column(
        db.String(150),
        nullable=False,
    )

    customer_email = db.Column(
        db.String(255),
        nullable=False,
        index=True,
    )

    customer_phone = db.Column(
        db.String(40),
        nullable=False,
    )

    address = db.Column(
        db.String(300),
        nullable=False,
    )

    city = db.Column(
        db.String(100),
        nullable=False,
    )

    notes = db.Column(
        db.Text,
        nullable=True,
    )

    total = db.Column(
        db.Numeric(10, 2),
        nullable=False,
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="pending",
        index=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    items = db.relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    order_id = db.Column(
        db.Integer,
        db.ForeignKey("orders.id"),
        nullable=False,
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False,
    )

    product_name = db.Column(
        db.String(180),
        nullable=False,
    )

    quantity = db.Column(
        db.Integer,
        nullable=False,
    )

    unit_price = db.Column(
        db.Numeric(10, 2),
        nullable=False,
    )

    line_total = db.Column(
        db.Numeric(10, 2),
        nullable=False,
    )

    order = db.relationship(
        "Order",
        back_populates="items",
    )

    product = db.relationship(
        "Product",
        back_populates="order_items",
    )

class SpecialPartRequest(db.Model):
    __tablename__ = "special_part_requests"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    request_number = db.Column(
        db.String(40),
        unique=True,
        nullable=False,
        index=True,
    )

    customer_name = db.Column(
        db.String(150),
        nullable=False,
    )

    customer_email = db.Column(
        db.String(255),
        nullable=False,
        index=True,
    )

    customer_phone = db.Column(
        db.String(40),
        nullable=False,
    )

    quantity = db.Column(
        db.Integer,
        nullable=False,
        default=1,
    )

    shipping_address = db.Column(
        db.Text,
        nullable=False,
        default="",
    )

    product_name = db.Column(
        db.String(200),
        nullable=False,
    )

    vehicle_make = db.Column(
        db.String(100),
        nullable=True,
    )

    vehicle_model = db.Column(
        db.String(100),
        nullable=True,
    )

    vehicle_year = db.Column(
        db.String(20),
        nullable=True,
    )

    details = db.Column(
        db.Text,
        nullable=False,
    )

    image_filename = db.Column(
        db.String(255),
        nullable=True,
    )

    quoted_price = db.Column(
        db.Numeric(10, 2),
        nullable=True,
    )

    admin_notes = db.Column(
        db.Text,
        nullable=True,
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="received",
        index=True,
    )




    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )


"""
class SpecialPartRequest(db.Model):
    __tablename__ = "special_part_requests"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    request_number = db.Column(
        db.String(40),
        unique=True,
        nullable=False,
        index=True,
    )

    customer_name = db.Column(
        db.String(150),
        nullable=False,
    )

    customer_email = db.Column(
        db.String(255),
        nullable=False,
        index=True,
    )

    customer_phone = db.Column(
        db.String(40),
        nullable=False,
    )

quantity = db.Column(
    db.Integer,
    nullable=False,
    default=1,
)

shipping_address = db.Column(
    db.Text,
    nullable=False,
)

    product_name = db.Column(
        db.String(200),
        nullable=False,
    )

    vehicle_make = db.Column(
        db.String(100),
        nullable=True,
    )

    vehicle_model = db.Column(
        db.String(100),
        nullable=True,
    )

    vehicle_year = db.Column(
        db.String(20),
        nullable=True,
    )

    details = db.Column(
        db.Text,
        nullable=False,
    )

    image_filename = db.Column(
        db.String(255),
        nullable=True,
    )

    quoted_price = db.Column(
        db.Numeric(10, 2),
        nullable=True,
    )

    admin_notes = db.Column(
        db.Text,
        nullable=True,
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="received",
        index=True,
    )

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    ) """


# ============================================================
# Helpers
# ============================================================

def generate_reference(prefix: str) -> str:
    date_part = datetime.utcnow().strftime("%Y%m%d")
    random_part = uuid.uuid4().hex[:8].upper()

    return f"{prefix}-{date_part}-{random_part}"


def clean_text(
    value: Any,
    *,
    maximum: int,
) -> str:
    return str(value or "").strip()[:maximum]


def valid_email(email: str) -> bool:
    if not email or "@" not in email:
        return False

    local_part, _, domain = email.partition("@")

    return bool(
        local_part
        and domain
        and "." in domain
        and " " not in email
    )


def valid_phone(phone: str) -> bool:
    allowed_characters = set(
        "0123456789+-() "
    )

    return (
        7 <= len(phone) <= 40
        and all(
            character in allowed_characters
            for character in phone
        )
    )


def allowed_image(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_IMAGE_EXTENSIONS
    )


def save_uploaded_image(
    image: FileStorage | None,
) -> str | None:
    if image is None or not image.filename:
        return None

    original_filename = secure_filename(
        image.filename
    )

    if not original_filename:
        raise ValueError(
            "The uploaded picture has an invalid filename."
        )

    if not allowed_image(original_filename):
        raise ValueError(
            "Only PNG, JPG, JPEG and WEBP images are allowed."
        )

    extension = (
        original_filename
        .rsplit(".", 1)[1]
        .lower()
    )

    generated_filename = (
        f"{uuid.uuid4().hex}.{extension}"
    )

    destination = (
        Path(app.config["UPLOAD_FOLDER"])
        / generated_filename
    )

    image.save(destination)

    return generated_filename


def parse_optional_price(
    value: str | None,
) -> Decimal | None:
    cleaned_value = str(value or "").strip()

    if not cleaned_value:
        return None

    try:
        price = Decimal(cleaned_value)
    except InvalidOperation as error:
        raise ValueError(
            "Quoted price must be a valid number."
        ) from error

    if price < 0:
        raise ValueError(
            "Quoted price cannot be negative."
        )

    return price.quantize(Decimal("0.01"))


def admin_required(
    view_function: Callable,
) -> Callable:
    @wraps(view_function)
    def wrapped_view(*args: Any, **kwargs: Any):
        if not session.get("admin_logged_in"):
            flash(
                "Please log in to access the dashboard.",
                "error",
            )

            return redirect(
                url_for("admin_login")
            )

        return view_function(*args, **kwargs)

    return wrapped_view


# ============================================================
# Public pages
# ============================================================

@app.get("/")
def home():
    return render_template("index.html")


@app.get("/checkout")
def checkout_page():
    return render_template("checkout.html")


@app.get("/special-order")
def special_order_page():
    return render_template("special-order.html")


@app.get("/order-success/<reference>")
def order_success(reference: str):
    reference = clean_text(
        reference,
        maximum=40,
    )

    return render_template(
        "order-success.html",
        reference=reference,
    )


# ============================================================
# Product API
# ============================================================

@app.get("/api/products")
def get_products():
    products = db.session.scalars(
        select(Product)
        .where(Product.active.is_(True))
        .order_by(Product.id.asc())
    ).all()

    return jsonify(
        [
            product.to_dict()
            for product in products
        ]
    )


# ============================================================
# Guest checkout API
# ============================================================

@app.post("/api/orders")
def create_order():
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify(
            {
                "success": False,
                "message": "Invalid JSON request.",
            }
        ), 400

    customer_name = clean_text(
        data.get("customerName"),
        maximum=150,
    )

    customer_email = clean_text(
        data.get("customerEmail"),
        maximum=255,
    ).lower()

    customer_phone = clean_text(
        data.get("customerPhone"),
        maximum=40,
    )

    address = clean_text(
        data.get("address"),
        maximum=300,
    )

    city = clean_text(
        data.get("city"),
        maximum=100,
    )

    notes = clean_text(
        data.get("notes"),
        maximum=1000,
    )

    cart_items = data.get("items")

    if len(customer_name) < 2:
        return jsonify(
            {
                "success": False,
                "message": "Please enter your full name.",
            }
        ), 400

    if not valid_email(customer_email):
        return jsonify(
            {
                "success": False,
                "message": "Please enter a valid email address.",
            }
        ), 400

    if not valid_phone(customer_phone):
        return jsonify(
            {
                "success": False,
                "message": "Please enter a valid phone number.",
            }
        ), 400

    if len(address) < 8:
        return jsonify(
            {
                "success": False,
                "message": "Please enter your complete address.",
            }
        ), 400

    if len(city) < 2:
        return jsonify(
            {
                "success": False,
                "message": "Please enter your city.",
            }
        ), 400

    if (
        not isinstance(cart_items, list)
        or not cart_items
    ):
        return jsonify(
            {
                "success": False,
                "message": "Your cart is empty.",
            }
        ), 400

    validated_items: list[
        tuple[Product, int, Decimal]
    ] = []

    total = Decimal("0.00")

    try:
        for raw_item in cart_items:
            if not isinstance(raw_item, dict):
                raise ValueError(
                    "Invalid cart item."
                )

            try:
                product_id = int(
                    raw_item.get("productId")
                )

                quantity = int(
                    raw_item.get("quantity")
                )
            except (TypeError, ValueError) as error:
                raise ValueError(
                    "Invalid product or quantity."
                ) from error

            if quantity < 1 or quantity > 50:
                raise ValueError(
                    "Product quantity must be between 1 and 50."
                )

            product = db.session.get(
                Product,
                product_id,
            )

            if (
                product is None
                or not product.active
            ):
                raise ValueError(
                    f"Product {product_id} is unavailable."
                )

            if product.stock < quantity:
                raise ValueError(
                    f"Only {product.stock} units of "
                    f"{product.name} are available."
                )

            line_total = (
                product.price * quantity
            )

            total += line_total

            validated_items.append(
                (
                    product,
                    quantity,
                    line_total,
                )
            )

        order = Order(
            order_number=generate_reference("ORD"),
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            address=address,
            city=city,
            notes=notes or None,
            total=total,
            status="pending",
        )

        db.session.add(order)
        db.session.flush()

        for (
            product,
            quantity,
            line_total,
        ) in validated_items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                quantity=quantity,
                unit_price=product.price,
                line_total=line_total,
            )

            product.stock -= quantity

            db.session.add(order_item)

        db.session.commit()

        return jsonify(
            {
                "success": True,
                "message": "Your order was placed successfully.",
                "orderId": order.id,
                "orderNumber": order.order_number,
                "total": float(order.total),
                "redirectUrl": url_for(
                    "order_success",
                    reference=order.order_number,
                ),
            }
        ), 201

    except ValueError as error:
        db.session.rollback()

        return jsonify(
            {
                "success": False,
                "message": str(error),
            }
        ), 400

    except SQLAlchemyError:
        db.session.rollback()
        app.logger.exception(
            "Database error while creating order."
        )

        return jsonify(
            {
                "success": False,
                "message": (
                    "The order could not be saved. "
                    "Please try again."
                ),
            }
        ), 500


# ============================================================
# Special unavailable-part request
# ============================================================
@app.post("/api/special-orders")
def create_special_order():
    customer_name = clean_text(
        request.form.get("customerName"),
        maximum=150,
    )

    customer_email = clean_text(
        request.form.get("customerEmail"),
        maximum=255,
    ).lower()

    customer_phone = clean_text(
        request.form.get("customerPhone"),
        maximum=40,
    )

    quantity_text = clean_text(
        request.form.get("quantity"),
        maximum=10,
    )

    shipping_address = clean_text(
    request.form.get("shippingAddress"),
    maximum=500,
)

    product_name = clean_text(
        request.form.get("productName"),
        maximum=200,
    )

    vehicle_make = clean_text(
        request.form.get("vehicleMake"),
        maximum=100,
    )

    vehicle_model = clean_text(
        request.form.get("vehicleModel"),
        maximum=100,
    )

    vehicle_year = clean_text(
        request.form.get("vehicleYear"),
        maximum=20,
    )

    details = clean_text(
        request.form.get("details"),
        maximum=2000,
    )

    image = request.files.get("productImage")

    if len(customer_name) < 2:
        return jsonify(
            {
                "success": False,
                "message": "Please enter your full name.",
            }
        ), 400

    if not valid_email(customer_email):
        return jsonify(
            {
                "success": False,
                "message": "Please enter a valid email address.",
            }
        ), 400

    if not valid_phone(customer_phone):
        return jsonify(
            {
                "success": False,
                "message": "Please enter a valid phone number.",
            }
        ), 400

    try:
        quantity = int(quantity_text)
    except (TypeError, ValueError):
        return jsonify(
            {
                "success": False,
                "message": "Quantity must be a whole number.",
            }
        ), 400

    if quantity < 1 or quantity > 100:
        return jsonify(
            {
                "success": False,
                "message": "Quantity must be between 1 and 100.",
            }
        ), 400

    if len(shipping_address) < 8:
        return jsonify(
            {
                "success": False,
                "message": "Please enter a complete shipping address.",
            }
        ), 400

    if len(product_name) < 2:
        return jsonify(
            {
                "success": False,
                "message": "Please enter the required product name.",
            }
        ), 400

    if len(details) < 10:
        return jsonify(
            {
                "success": False,
                "message": (
                    "Please provide more information "
                    "about the required part."
                ),
            }
        ), 400

    saved_filename: str | None = None

    try:
        saved_filename = save_uploaded_image(image)

        special_request = SpecialPartRequest(
            request_number=generate_reference("REQ"),
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            quantity=quantity,
            shipping_address=shipping_address,
            product_name=product_name,
            vehicle_make=vehicle_make or None,
            vehicle_model=vehicle_model or None,
            vehicle_year=vehicle_year or None,
            details=details,
            image_filename=saved_filename,
            status="received",
        )

        db.session.add(special_request)
        db.session.commit()

        return jsonify(
            {
                "success": True,
                "message": (
                    "Your special-part request was submitted."
                ),
                "requestNumber": special_request.request_number,
                "redirectUrl": url_for(
                    "order_success",
                    reference=special_request.request_number,
                ),
            }
        ), 201

    except ValueError as error:
        return jsonify(
            {
                "success": False,
                "message": str(error),
            }
        ), 400

    except SQLAlchemyError:
        db.session.rollback()

        if saved_filename:
            uploaded_file = UPLOAD_FOLDER / saved_filename

            if uploaded_file.exists():
                uploaded_file.unlink()

        app.logger.exception(
            "Database error while saving special request."
        )

        return jsonify(
            {
                "success": False,
                "message": (
                    "Your request could not be saved. "
                    "Please try again."
                ),
            }
        ), 500



"""
 @app.post("/api/special-orders")
def create_special_order():
    customer_name = clean_text(
        request.form.get("customerName"),
        maximum=150,
    )

    customer_email = clean_text(
        request.form.get("customerEmail"),
        maximum=255,
    ).lower()

    customer_phone = clean_text(
        request.form.get("customerPhone"),
        maximum=40,
    )


    

    product_name = clean_text(
        request.form.get("productName"),
        maximum=200,
    )

    vehicle_make = clean_text(
        request.form.get("vehicleMake"),
        maximum=100,
    )

    vehicle_model = clean_text(
        request.form.get("vehicleModel"),
        maximum=100,
    )

    vehicle_year = clean_text(
        request.form.get("vehicleYear"),
        maximum=20,
    )

    details = clean_text(
        request.form.get("details"),
        maximum=2000,
    )

    image = request.files.get("productImage")

    if len(customer_name) < 2:
        return jsonify(
            {
                "success": False,
                "message": "Please enter your full name.",
            }
        ), 400

    if not valid_email(customer_email):
        return jsonify(
            {
                "success": False,
                "message": "Please enter a valid email address.",
            }
        ), 400

    if not valid_phone(customer_phone):
        return jsonify(
            {
                "success": False,
                "message": "Please enter a valid phone number.",
            }
        ), 400

    if len(product_name) < 2:
        return jsonify(
            {
                "success": False,
                "message": "Please enter the required product name.",
            }
        ), 400

    if len(details) < 10:
        return jsonify(
            {
                "success": False,
                "message": (
                    "Please provide more information "
                    "about the required part."
                ),
            }
        ), 400

    saved_filename: str | None = None

    try:
        saved_filename = save_uploaded_image(
            image
        )

        special_request = SpecialPartRequest(
            request_number=generate_reference("REQ"),
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone,
            product_name=product_name,
            vehicle_make=vehicle_make or None,
            vehicle_model=vehicle_model or None,
            vehicle_year=vehicle_year or None,
            details=details,
            image_filename=saved_filename,
            status="received",
        )

        db.session.add(special_request)
        db.session.commit()

        return jsonify(
            {
                "success": True,
                "message": (
                    "Your special-part request was submitted."
                ),
                "requestNumber": (
                    special_request.request_number
                ),
                "redirectUrl": url_for(
                    "order_success",
                    reference=(
                        special_request.request_number
                    ),
                ),
            }
        ), 201

    except ValueError as error:
        return jsonify(
            {
                "success": False,
                "message": str(error),
            }
        ), 400

    except SQLAlchemyError:
        db.session.rollback()

        if saved_filename:
            uploaded_file = (
                UPLOAD_FOLDER / saved_filename
            )

            if uploaded_file.exists():
                uploaded_file.unlink()

        app.logger.exception(
            "Database error while saving special request."
        )

        return jsonify(
            {
                "success": False,
                "message": (
                    "Your request could not be saved. "
                    "Please try again."
                ),
            }
        ), 500"""


# ============================================================
# Admin authentication
# ============================================================

@app.route(
    "/admin/login",
    methods=["GET", "POST"],
)
def admin_login():
    if session.get("admin_logged_in"):
        return redirect(
            url_for("admin_dashboard")
        )

    if request.method == "POST":
        username = clean_text(
            request.form.get("username"),
            maximum=100,
        )

        password = str(
            request.form.get("password") or ""
        )

        expected_username = os.getenv(
            "ADMIN_USERNAME",
            "admin",
        )

        expected_password = os.getenv(
            "ADMIN_PASSWORD",
            "ChangeThisPassword123!",
        )

        if (
            username == expected_username
            and password == expected_password
        ):
            session.clear()
            session["admin_logged_in"] = True
            session["admin_username"] = username

            flash(
                "Welcome to the AUTO Rubber Hub dashboard.",
                "success",
            )

            return redirect(
                url_for("admin_dashboard")
            )

        flash(
            "Incorrect administrator username or password.",
            "error",
        )

    return render_template("admin-login.html")


@app.post("/admin/logout")
@admin_required
def admin_logout():
    session.clear()

    flash(
        "You have been logged out.",
        "success",
    )

    return redirect(
        url_for("admin_login")
    )


# ============================================================
# Admin dashboard
# ============================================================

@app.get("/admin")
@admin_required
def admin_dashboard():
    orders = db.session.scalars(
        select(Order)
        .order_by(Order.created_at.desc())
    ).all()

    special_requests = db.session.scalars(
        select(SpecialPartRequest)
        .order_by(
            SpecialPartRequest.created_at.desc()
        )
    ).all()

    products = db.session.scalars(
        select(Product)
        .order_by(Product.name.asc())
    ).all()

    return render_template(
        "admin-dashboard.html",
        orders=orders,
        special_requests=special_requests,
        products=products,
        order_statuses=sorted(
            ORDER_STATUSES
        ),
        request_statuses=sorted(
            REQUEST_STATUSES
        ),
    )

@app.post("/admin/products/add")
@admin_required
def add_product():
    name = clean_text(
        request.form.get("name"),
        maximum=180,
    )

    category = clean_text(
        request.form.get("category"),
        maximum=80,
    ).lower()

    compatibility = clean_text(
        request.form.get("compatibility"),
        maximum=250,
    )

    description = clean_text(
        request.form.get("description"),
        maximum=2000,
    )

    price_text = clean_text(
        request.form.get("price"),
        maximum=30,
    )

    old_price_text = clean_text(
        request.form.get("oldPrice"),
        maximum=30,
    )

    stock_text = clean_text(
        request.form.get("stock"),
        maximum=20,
    )

    if not name:
        flash("Product name is required.", "error")
        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    if not category:
        flash("Category is required.", "error")
        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    if not compatibility:
        flash("Compatibility is required.", "error")
        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    if not description:
        flash("Description is required.", "error")
        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    try:
        price = Decimal(price_text).quantize(
            Decimal("0.01")
        )

        old_price = (
            Decimal(old_price_text).quantize(
                Decimal("0.01")
            )
            if old_price_text
            else None
        )

        stock = int(stock_text)

    except (InvalidOperation, ValueError):
        flash(
            "Price, old price or stock is invalid.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    if price < 0:
        flash("Price cannot be negative.", "error")
        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    if old_price is not None and old_price < 0:
        flash("Old price cannot be negative.", "error")
        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    if stock < 0:
        flash("Stock cannot be negative.", "error")
        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    existing_product = db.session.scalar(
        select(Product).where(
            Product.name == name
        )
    )

    if existing_product:
        flash(
            "A product with this name already exists.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    product = Product(
        name=name,
        category=category,
        compatibility=compatibility,
        description=description,
        price=price,
        old_price=old_price,
        stock=stock,
        active=True,
    )

    try:
        db.session.add(product)
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()

        app.logger.exception(
            "Database error while adding product."
        )

        flash(
            "The product could not be saved.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    flash(
        f"{product.name} added successfully.",
        "success",
    )

    return redirect(
        url_for("admin_dashboard") + "#inventory"
    )


# ============================================================
# Admin product management
# ============================================================

@app.post("/admin/products/<int:product_id>/edit")
@admin_required
def edit_product(product_id: int):
    product = db.get_or_404(Product, product_id)

    name = clean_text(
        request.form.get("name"),
        maximum=180,
    )

    category = clean_text(
        request.form.get("category"),
        maximum=80,
    ).lower()

    compatibility = clean_text(
        request.form.get("compatibility"),
        maximum=250,
    )

    description = clean_text(
        request.form.get("description"),
        maximum=2000,
    )

    price_text = clean_text(
        request.form.get("price"),
        maximum=30,
    )

    old_price_text = clean_text(
        request.form.get("oldPrice"),
        maximum=30,
    )

    stock_text = clean_text(
        request.form.get("stock"),
        maximum=20,
    )

    if not all(
        [
            name,
            category,
            compatibility,
            description,
            price_text,
            stock_text,
        ]
    ):
        flash(
            "Please complete all required product fields.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    try:
        price = Decimal(price_text).quantize(
            Decimal("0.01")
        )

        old_price = (
            Decimal(old_price_text).quantize(
                Decimal("0.01")
            )
            if old_price_text
            else None
        )

        stock = int(stock_text)

    except (InvalidOperation, ValueError):
        flash(
            "Price, old price or stock is invalid.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    if price < 0:
        flash(
            "Price cannot be negative.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    if old_price is not None and old_price < 0:
        flash(
            "Old price cannot be negative.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    if stock < 0:
        flash(
            "Stock cannot be negative.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    duplicate_product = db.session.scalar(
        select(Product).where(
            Product.name == name,
            Product.id != product.id,
        )
    )

    if duplicate_product:
        flash(
            "Another product already uses this name.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    product.name = name
    product.category = category
    product.compatibility = compatibility
    product.description = description
    product.price = price
    product.old_price = old_price
    product.stock = stock

    try:
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()

        app.logger.exception(
            "Database error while editing product."
        )

        flash(
            "The product could not be updated.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    flash(
        f"{product.name} updated successfully.",
        "success",
    )

    return redirect(
        url_for("admin_dashboard") + "#inventory"
    )


@app.post("/admin/products/<int:product_id>/archive")
@admin_required
def archive_product(product_id: int):
    product = db.get_or_404(Product, product_id)

    product.active = False

    try:
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()

        app.logger.exception(
            "Database error while archiving product."
        )

        flash(
            "The product could not be archived.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    flash(
        f"{product.name} was archived.",
        "success",
    )

    return redirect(
        url_for("admin_dashboard") + "#inventory"
    )


@app.post("/admin/products/<int:product_id>/restore")
@admin_required
def restore_product(product_id: int):
    product = db.get_or_404(Product, product_id)

    product.active = True

    try:
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()

        app.logger.exception(
            "Database error while restoring product."
        )

        flash(
            "The product could not be restored.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    flash(
        f"{product.name} is active again.",
        "success",
    )

    return redirect(
        url_for("admin_dashboard") + "#inventory"
    )


@app.post("/admin/products/<int:product_id>/delete")
@admin_required
def delete_product(product_id: int):
    product = db.get_or_404(Product, product_id)

    if product.order_items:
        flash(
            (
                "This product cannot be permanently deleted "
                "because it is connected to previous orders. "
                "Archive it instead."
            ),
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    product_name = product.name

    try:
        db.session.delete(product)
        db.session.commit()

    except SQLAlchemyError:
        db.session.rollback()

        app.logger.exception(
            "Database error while deleting product."
        )

        flash(
            "The product could not be deleted.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard") + "#inventory"
        )

    flash(
        f"{product_name} was permanently deleted.",
        "success",
    )

    return redirect(
        url_for("admin_dashboard") + "#inventory"
    )



@app.post(
    "/admin/orders/<int:order_id>/status"
)
@admin_required
def update_order_status(order_id: int):
    order = db.get_or_404(
        Order,
        order_id,
    )

    new_status = clean_text(
        request.form.get("status"),
        maximum=30,
    ).lower()

    if new_status not in ORDER_STATUSES:
        flash(
            "Invalid order status.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard")
        )

    order.status = new_status
    db.session.commit()

    flash(
        f"{order.order_number} changed to "
        f"{new_status.title()}.",
        "success",
    )

    return redirect(
        url_for("admin_dashboard")
    )


@app.post(
    "/admin/special-orders/"
    "<int:request_id>/update"
)
@admin_required
def update_special_order(
    request_id: int,
):
    special_request = db.get_or_404(
        SpecialPartRequest,
        request_id,
    )

    new_status = clean_text(
        request.form.get("status"),
        maximum=30,
    ).lower()

    admin_notes = clean_text(
        request.form.get("adminNotes"),
        maximum=2000,
    )

    if new_status not in REQUEST_STATUSES:
        flash(
            "Invalid special-request status.",
            "error",
        )

        return redirect(
            url_for("admin_dashboard")
        )

    try:
        quoted_price = parse_optional_price(
            request.form.get("quotedPrice")
        )
    except ValueError as error:
        flash(
            str(error),
            "error",
        )

        return redirect(
            url_for("admin_dashboard")
        )

    special_request.status = new_status
    special_request.admin_notes = (
        admin_notes or None
    )
    special_request.quoted_price = quoted_price

    db.session.commit()

    flash(
        f"{special_request.request_number} updated.",
        "success",
    )

    return redirect(
        url_for("admin_dashboard")
    )


@app.get(
    "/admin/uploads/<path:filename>"
)
@admin_required
def view_uploaded_image(filename: str):
    safe_filename = secure_filename(filename)

    if not safe_filename:
        return "Invalid filename", 400

    safe_path = safe_join(
        app.config["UPLOAD_FOLDER"],
        safe_filename,
    )

    if safe_path is None:
        return "Invalid path", 400

    return send_from_directory(
        app.config["UPLOAD_FOLDER"],
        safe_filename,
    )


# ============================================================
# Error handlers
# ============================================================

@app.errorhandler(413)
def file_too_large(_error):
    if request.path.startswith("/api/"):
        return jsonify(
            {
                "success": False,
                "message": (
                    "The image is too large. "
                    "Maximum size is 5 MB."
                ),
            }
        ), 413

    return (
        "Uploaded file is too large. "
        "Maximum size is 5 MB.",
        413,
    )


@app.errorhandler(404)
def page_not_found(_error):
    if request.path.startswith("/api/"):
        return jsonify(
            {
                "success": False,
                "message": "Resource not found.",
            }
        ), 404

    return (
        "<h1>404</h1>"
        "<p>The requested page was not found.</p>",
        404,
    )


# ============================================================
# Initial product data
# ============================================================

def seed_products() -> None:
    existing_product = db.session.scalar(
        select(Product.id).limit(1)
    )

    if existing_product is not None:
        return

    products = [
        Product(
            name="Toyota Corolla Door Seal",
            category="seals",
            compatibility=(
                "Toyota Corolla 2014–2020"
            ),
            description=(
                "Door sealing rubber designed to reduce "
                "wind noise, water and dust entry."
            ),
            price=Decimal("24.99"),
            old_price=Decimal("29.99"),
            stock=25,
        ),
        Product(
            name="Honda Glass Run Channel",
            category="seals",
            compatibility=(
                "Selected Honda models"
            ),
            description=(
                "Flexible glass channel for smooth "
                "window movement and weather protection."
            ),
            price=Decimal("19.99"),
            old_price=Decimal("23.99"),
            stock=30,
        ),
        Product(
            name="Control Arm Bush Kit",
            category="bushes",
            compatibility=(
                "Multiple vehicle models"
            ),
            description=(
                "Heavy-duty suspension bushes designed "
                "to reduce vibration and road noise."
            ),
            price=Decimal("34.99"),
            old_price=Decimal("39.99"),
            stock=18,
        ),
        Product(
            name="Engine Mounting Rubber",
            category="mounts",
            compatibility=(
                "Selected Japanese vehicles"
            ),
            description=(
                "Vibration-control mounting rubber "
                "for improved engine stability."
            ),
            price=Decimal("42.99"),
            old_price=Decimal("49.99"),
            stock=15,
        ),
    ]

    db.session.add_all(products)
    db.session.commit()


with app.app_context():
    db.create_all()
    seed_products()


if __name__ == "__main__":
    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000,
    )