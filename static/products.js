"use strict";

let databaseProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    loadProductsFromDatabase();
});

async function loadProductsFromDatabase() {
    const productGrid = document.querySelector("#product-grid");

    if (!productGrid) {
        console.error(
            "Could not find #product-grid in index.html."
        );

        return;
    }

    productGrid.innerHTML = `
        <p class="products-loading">
            Loading products...
        </p>
    `;

    try {
        const response = await fetch("/api/products", {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(
                `Product API returned ${response.status}.`
            );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(
                "Product API returned invalid data."
            );
        }

        databaseProducts = data;

        renderProducts(databaseProducts);
    } catch (error) {
        console.error(
            "Could not load products:",
            error
        );

        productGrid.innerHTML = `
            <div class="product-message">
                <h3>Products could not be loaded</h3>
                <p>
                    Please refresh the page and try again.
                </p>
            </div>
        `;
    }
}

function renderProducts(products) {
    const productGrid = document.querySelector("#product-grid");

    if (!productGrid) {
        return;
    }

    if (products.length === 0) {
        productGrid.innerHTML = `
            <div class="product-message">
                <h3>No products available</h3>
                <p>
                    Add a product from the admin dashboard.
                </p>
            </div>
        `;

        return;
    }

    productGrid.innerHTML = products
        .map((product, index) => {
            return createProductCard(product, index);
        })
        .join("");

    bindProductButtons();
}

function createProductCard(product, index) {
    const productId = Number(product.id);
    const price = Number(product.price || 0);
    const stock = Number(product.stock || 0);
    const inStock = stock > 0;

    const oldPrice =
        product.oldPrice !== null &&
        product.oldPrice !== undefined
            ? Number(product.oldPrice)
            : null;

    return `
        <article
            class="product-card glass-panel"
            data-product-id="${productId}"
            data-category="${escapeHtml(product.category)}"
        >
            <div class="product-image-area">
                <span class="product-badge">
                    ${getProductBadge(index)}
                </span>

                <button
                    type="button"
                    class="favorite-button"
                    data-product-id="${productId}"
                    aria-label="Favourite ${escapeHtml(product.name)}"
                >
                    ♡
                </button>

                <div
                    class="product-illustration ${getIllustrationClass(
                        product.category
                    )}"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>

            <div class="product-content">
                <div class="product-meta">
                    <span>
                        ${escapeHtml(
                            formatCategory(product.category)
                        )}
                    </span>

                    <span class="${
                        inStock
                            ? "in-stock"
                            : "out-of-stock"
                    }">
                        ${
                            inStock
                                ? "IN STOCK"
                                : "OUT OF STOCK"
                        }
                    </span>
                </div>

                <h3>
                    ${escapeHtml(product.name)}
                </h3>

                <p>
                    ${escapeHtml(
                        product.description ||
                        product.compatibility ||
                        ""
                    )}
                </p>

                <div class="product-bottom">
                    <div class="product-price">
                        <strong>
                            $${price.toFixed(2)}
                        </strong>

                        ${
                            oldPrice !== null
                                ? `
                                    <del>
                                        $${oldPrice.toFixed(2)}
                                    </del>
                                `
                                : ""
                        }
                    </div>

                    <button
                        type="button"
                        class="add-cart-button"
                        data-product-id="${productId}"
                        aria-label="Add ${escapeHtml(
                            product.name
                        )} to cart"
                        ${inStock ? "" : "disabled"}
                    >
                        +
                    </button>
                </div>
            </div>
        </article>
    `;
}

function bindProductButtons() {
    document
        .querySelectorAll(".add-cart-button")
        .forEach((button) => {
            button.addEventListener("click", () => {
                const productId = Number(
                    button.dataset.productId
                );

                const product = databaseProducts.find(
                    (item) =>
                        Number(item.id) === productId
                );

                if (!product) {
                    return;
                }

                if (typeof window.addToCart === "function") {
                    window.addToCart(productId);
                    return;
                }

                addProductToLocalCart(product);
            });
        });

    document
        .querySelectorAll(".favorite-button")
        .forEach((button) => {
            button.addEventListener("click", () => {
                button.classList.toggle("active");

                button.textContent =
                    button.classList.contains("active")
                        ? "♥"
                        : "♡";
            });
        });
}
  



function addProductToLocalCart(product) {
    const storageKey = "autoRubberHubCart";

    let cart = [];

    try {
        const savedCart = localStorage.getItem(storageKey);
        cart = savedCart ? JSON.parse(savedCart) : [];

        if (!Array.isArray(cart)) {
            cart = [];
        }
    } catch (error) {
        console.error("Could not read cart:", error);
        cart = [];
    }

    const productId = Number(product.id);

    const existingItem = cart.find(
        (item) =>
            Number(item.id ?? item.productId) === productId
    );

    if (existingItem) {
        existingItem.id = productId;
        existingItem.productId = productId;
        existingItem.name = product.name;
        existingItem.price = Number(product.price);
        existingItem.quantity =
            Number(existingItem.quantity || 0) + 1;
    } else {
        cart.push({
            id: productId,
            productId: productId,
            name: product.name,
            price: Number(product.price),
            quantity: 1,
        });
    }

    localStorage.setItem(
        storageKey,
        JSON.stringify(cart)
    );

    updateCartCount(cart);

    window.dispatchEvent(
        new CustomEvent("cartUpdated", {
            detail: {
                cart,
            },
        })
    );
}



/*
function addProductToLocalCart(product) {
    const savedCart = localStorage.getItem(
        "autoRubberHubCart"
    );

    let cart = [];

    try {
        cart = savedCart
            ? JSON.parse(savedCart)
            : [];
    } catch {
        cart = [];
    }

    const existingItem = cart.find(
        (item) =>
            Number(item.productId) ===
            Number(product.id)
    );

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId: Number(product.id),
            name: product.name,
            price: Number(product.price),
            quantity: 1,
        });
    }

    localStorage.setItem(
        "autoRubberHubCart",
        JSON.stringify(cart)
    );

    updateCartCount(cart);
} */

function updateCartCount(cart) {
    const cartCount = document.querySelector(
        ".cart-count"
    );

    if (!cartCount) {
        return;
    }

    const totalQuantity = cart.reduce(
        (total, item) =>
            total + Number(item.quantity || 0),
        0
    );

    cartCount.textContent = String(totalQuantity);
}

function formatCategory(category) {
    return String(category || "Product")
        .replaceAll("-", " ")
        .replace(/\b\w/g, (letter) =>
            letter.toUpperCase()
        );
}

function getProductBadge(index) {
    const badges = [
        "BEST SELLER",
        "PREMIUM",
        "POPULAR",
        "NEW",
    ];

    return badges[index % badges.length];
}

function getIllustrationClass(category) {
    const value = String(
        category || ""
    ).toLowerCase();

    if (
        value.includes("bush") ||
        value.includes("suspension")
    ) {
        return "bush-illustration";
    }

    if (value.includes("mount")) {
        return "mount-illustration";
    }

    if (
        value.includes("window") ||
        value.includes("channel")
    ) {
        return "channel-illustration";
    }

    return "seal-illustration";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}