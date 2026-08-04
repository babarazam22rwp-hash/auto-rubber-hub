"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const cartStorageKey = "autoRubberHubCart";

    const fallbackProducts = [
        {
            id: 1,
            name: "Toyota Corolla Door Seal",
            price: 24.99
        },
        {
            id: 2,
            name: "Honda Glass Run Channel",
            price: 19.99
        },
        {
            id: 3,
            name: "Control Arm Bush Kit",
            price: 34.99
        },
        {
            id: 4,
            name: "Engine Mounting Rubber",
            price: 42.99
        }
    ];

    const form = document.querySelector(
        "#checkout-form"
    );

    const itemsContainer = document.querySelector(
        "#checkout-items"
    );

    const totalElement = document.querySelector(
        "#checkout-total"
    );

    const messageElement = document.querySelector(
        "#checkout-message"
    );

    const submitButton = document.querySelector(
        "#place-order-button"
    );

    let products = [];
    let cart = loadCart();

    initialize();

    async function initialize() {
        products = await loadProducts();

        renderSummary();

        form.addEventListener(
            "submit",
            submitOrder
        );
    }

    function loadCart() {
        try {
            const savedCart = JSON.parse(
                localStorage.getItem(
                    cartStorageKey
                ) || "[]"
            );

            return Array.isArray(savedCart)
                ? savedCart
                : [];
        } catch (error) {
            console.error(
                "Could not read cart:",
                error
            );

            return [];
        }
    }

    async function loadProducts() {
        try {
            const response = await fetch(
                "/api/products"
            );

            if (!response.ok) {
                throw new Error(
                    "Products could not be loaded."
                );
            }

            return await response.json();
        } catch (error) {
            console.error(error);

            return fallbackProducts;
        }
    }

    function getProduct(productId) {
        return products.find(
            (product) =>
                Number(product.id)
                === Number(productId)
        );
    }

    function renderSummary() {
        if (cart.length === 0) {
            itemsContainer.innerHTML = `
                <div class="empty-summary">
                    Your cart is empty.
                    <a href="/">Return to the store</a>
                </div>
            `;

            totalElement.textContent = "$0.00";
            submitButton.disabled = true;

            return;
        }

        let total = 0;

        itemsContainer.innerHTML = cart
            .map((item) => {
                const product = getProduct(
                    item.productId
                );

                if (!product) {
                    return "";
                }

                const quantity = Number(
                    item.quantity
                );

                const lineTotal = (
                    Number(product.price)
                    * quantity
                );

                total += lineTotal;

                return `
                    <article class="summary-item">
                        <div>
                            <strong>
                                ${escapeHtml(product.name)}
                            </strong>

                            <span>
                                Quantity: ${quantity}
                            </span>
                        </div>

                        <strong>
                            ${formatCurrency(lineTotal)}
                        </strong>
                    </article>
                `;
            })
            .join("");

        totalElement.textContent =
            formatCurrency(total);
    }

    async function submitOrder(event) {
        event.preventDefault();

        if (cart.length === 0) {
            showMessage(
                "Your cart is empty.",
                "error"
            );

            return;
        }

        const formData = new FormData(form);

        const orderData = {
            customerName:
                formData.get("customerName"),
            customerEmail:
                formData.get("customerEmail"),
            customerPhone:
                formData.get("customerPhone"),
            address:
                formData.get("address"),
            city:
                formData.get("city"),
            notes:
                formData.get("notes"),
            items: cart.map((item) => ({
                productId: Number(
                    item.productId
                ),
                quantity: Number(
                    item.quantity
                )
            }))
        };

        setSubmitting(true);

        try {
            const response = await fetch(
                "/api/orders",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify(
                        orderData
                    )
                }
            );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message
                    || "Order could not be placed."
                );
            }

            localStorage.removeItem(
                cartStorageKey
            );

            window.location.href =
                result.redirectUrl;
        } catch (error) {
            showMessage(
                error.message,
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    }

    function setSubmitting(isSubmitting) {
        submitButton.disabled = isSubmitting;

        submitButton.textContent =
            isSubmitting
                ? "Placing Order..."
                : "Place Order";
    }

    function showMessage(
        message,
        type
    ) {
        messageElement.textContent = message;
        messageElement.className =
            `form-message ${type}`;
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat(
            "en-US",
            {
                style: "currency",
                currency: "USD"
            }
        ).format(value);
    }

    function escapeHtml(value) {
        const element =
            document.createElement("div");

        element.textContent = String(value);

        return element.innerHTML;
    }
});