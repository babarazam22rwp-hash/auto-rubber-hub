"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const STORAGE_KEY = "autoRubberHubCart";

    const state = {
        products: [],
        cart: loadCart(),
        activeFilter: "all",
    };

    const elements = {
        productGrid: document.querySelector("#product-grid"),
        cartButton: document.querySelector(".cart-button"),
        cartCount: document.querySelector(".cart-count"),
        filterButtons: document.querySelectorAll(".filter-button"),
        menuToggle: document.querySelector("#menu-toggle"),
        navigationLinks: document.querySelectorAll(".nav-link"),
    };

    initializeStore();

    async function initializeStore() {
        createCartDrawer();
        bindNavigation();
        bindCartButton();
        bindFilters();

        await loadProducts();

        renderProducts();
        updateCartUI();
    }

    // ========================================================
    // Products from Flask and SQLite
    // ========================================================

    async function loadProducts() {
        if (!elements.productGrid) {
            console.error(
                "The #product-grid element was not found in index.html."
            );
            return;
        }

        elements.productGrid.innerHTML = `
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
                    `Product API returned status ${response.status}.`
                );
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error(
                    "Product API returned an invalid response."
                );
            }

            state.products = data;

            console.log(
                "Products loaded from database:",
                state.products
            );
        } catch (error) {
            console.error("Product loading failed:", error);

            elements.productGrid.innerHTML = `
                <div class="product-message">
                    <h3>Products could not be loaded</h3>
                    <p>${escapeHtml(error.message)}</p>
                </div>
            `;
        }
    }

    function renderProducts() {
        if (!elements.productGrid) {
            return;
        }

        const visibleProducts = state.products.filter(
            (product) => {
                if (state.activeFilter === "all") {
                    return true;
                }

                return (
                    String(product.category).toLowerCase() ===
                    state.activeFilter
                );
            }
        );

        if (visibleProducts.length === 0) {
            elements.productGrid.innerHTML = `
                <div class="product-message">
                    <h3>No products found</h3>
                    <p>
                        Add an active product from the admin dashboard
                        or choose another category.
                    </p>
                </div>
            `;
            return;
        }

        elements.productGrid.innerHTML = visibleProducts
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
                        ${getBadge(index)}
                    </span>

                    <button
                        type="button"
                        class="favorite-button"
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
                                ? "database-in-stock"
                                : "database-out-of-stock"
                        }">
                            ${
                                inStock
                                    ? `${stock} IN STOCK`
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
                               ${formatCurrency(price)}
                            </strong>

                            ${
                                oldPrice !== null
                                    ? `
                                        <del>
                                            ${oldPrice.toFixed(2)}
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

                    addToCart(productId);
                });
            });

        document
            .querySelectorAll(".favorite-button")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    button.classList.toggle(
                        "favorite-button-active"
                    );

                    button.textContent =
                        button.classList.contains(
                            "favorite-button-active"
                        )
                            ? "♥"
                            : "♡";
                });
            });
    }

    // ========================================================
    // Product filters
    // ========================================================

    function bindFilters() {
        elements.filterButtons.forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();

                const filter =
                    button.textContent
                        .trim()
                        .toLowerCase();

                state.activeFilter =
                    filter === "all"
                        ? "all"
                        : filter;

                elements.filterButtons.forEach(
                    (filterButton) => {
                        filterButton.classList.toggle(
                            "active",
                            filterButton === button
                        );
                    }
                );

                renderProducts();
            });
        });
    }

    // ========================================================
    // Cart storage
    // ========================================================

    function loadCart() {
        try {
            const savedCart =
                localStorage.getItem(STORAGE_KEY);

            if (!savedCart) {
                return [];
            }

            const parsedCart = JSON.parse(savedCart);

            return Array.isArray(parsedCart)
                ? parsedCart
                : [];
        } catch (error) {
            console.error(
                "Could not read saved cart:",
                error
            );

            return [];
        }
    }

    function saveCart() {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state.cart)
        );
    }

    function getProduct(productId) {
        return state.products.find(
            (product) =>
                Number(product.id) ===
                Number(productId)
        );
    }

    function addToCart(productId) {
        const product = getProduct(productId);

        if (!product) {
            showStoreMessage(
                "Product could not be found."
            );
            return;
        }

        if (Number(product.stock) <= 0) {
            showStoreMessage(
                "This product is currently out of stock."
            );
            return;
        }

        const existingItem = state.cart.find(
            (item) =>
                Number(item.productId) ===
                Number(productId)
        );

        if (existingItem) {
            if (
                existingItem.quantity >=
                Number(product.stock)
            ) {
                showStoreMessage(
                    "You cannot add more than the available stock."
                );
                return;
            }

            existingItem.quantity += 1;
        } else {
            state.cart.push({
                productId: Number(product.id),
                quantity: 1,
            });
        }

        saveCart();
        updateCartUI();
        openCartDrawer();
    }

    function removeFromCart(productId) {
        state.cart = state.cart.filter(
            (item) =>
                Number(item.productId) !==
                Number(productId)
        );

        saveCart();
        updateCartUI();
    }

    function changeQuantity(productId, amount) {
        const cartItem = state.cart.find(
            (item) =>
                Number(item.productId) ===
                Number(productId)
        );

        const product = getProduct(productId);

        if (!cartItem || !product) {
            return;
        }

        const newQuantity =
            Number(cartItem.quantity) + amount;

        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        if (newQuantity > Number(product.stock)) {
            showStoreMessage(
                "Maximum available stock reached."
            );
            return;
        }

        cartItem.quantity = newQuantity;

        saveCart();
        updateCartUI();
    }

    function clearCart() {
        state.cart = [];

        saveCart();
        updateCartUI();
    }

    function getCartQuantity() {
        return state.cart.reduce(
            (total, item) =>
                total + Number(item.quantity || 0),
            0
        );
    }

    function getCartSubtotal() {
        return state.cart.reduce(
            (total, item) => {
                const product = getProduct(
                    item.productId
                );

                if (!product) {
                    return total;
                }

                return (
                    total +
                    Number(product.price) *
                        Number(item.quantity)
                );
            },
            0
        );
    }

    // ========================================================
    // Cart drawer
    // ========================================================

    function createCartDrawer() {
        const oldDrawer =
            document.querySelector("#store-cart-overlay");

        if (oldDrawer) {
            oldDrawer.remove();
        }

        const overlay =
            document.createElement("div");

        overlay.id = "store-cart-overlay";
        overlay.className = "store-cart-overlay";

        overlay.innerHTML = `
            <aside
                class="store-cart-drawer"
                aria-label="Shopping cart"
            >
                <div class="store-cart-header">
                    <div>
                        <span>YOUR SELECTION</span>
                        <h2>Shopping Cart</h2>
                    </div>

                    <button
                        type="button"
                        class="store-cart-close"
                        aria-label="Close cart"
                    >
                        ×
                    </button>
                </div>

                <div
                    class="store-cart-items"
                    id="store-cart-items"
                ></div>

                <div class="store-cart-footer">
                    <div class="store-cart-subtotal">
                        <span>Subtotal</span>

                        <strong id="store-cart-subtotal">
                            PKR 0.00
                        </strong>
                    </div>

                    <p>
                        Delivery and taxes are calculated
                        during checkout.
                    </p>

                    <button
                        type="button"
                        class="primary-button store-checkout-button"
                    >
                        Proceed to Checkout
                    </button>

                    <button
                        type="button"
                        class="store-clear-cart"
                    >
                        Clear Cart
                    </button>
                </div>
            </aside>
        `;

        document.body.appendChild(overlay);

        overlay
            .querySelector(".store-cart-close")
            .addEventListener(
                "click",
                closeCartDrawer
            );

        overlay
            .querySelector(".store-clear-cart")
            .addEventListener(
                "click",
                clearCart
            );

        overlay
            .querySelector(".store-checkout-button")
            .addEventListener(
                "click",
                proceedToCheckout
            );

        overlay.addEventListener(
            "click",
            (event) => {
                if (event.target === overlay) {
                    closeCartDrawer();
                }
            }
        );
    }

    function bindCartButton() {
        if (!elements.cartButton) {
            return;
        }

        elements.cartButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                openCartDrawer();
            }
        );
    }

    function openCartDrawer() {
        const overlay =
            document.querySelector(
                "#store-cart-overlay"
            );

        if (!overlay) {
            return;
        }

        renderCartItems();

        overlay.classList.add(
            "store-cart-overlay-visible"
        );

        document.body.classList.add("no-scroll");
    }

    function closeCartDrawer() {
        const overlay =
            document.querySelector(
                "#store-cart-overlay"
            );

        if (!overlay) {
            return;
        }

        overlay.classList.remove(
            "store-cart-overlay-visible"
        );

        document.body.classList.remove("no-scroll");
    }

    function updateCartUI() {
        if (elements.cartCount) {
            const quantity = getCartQuantity();

            elements.cartCount.textContent =
                String(quantity);

            elements.cartCount.style.display =
                quantity > 0
                    ? "grid"
                    : "none";
        }

        renderCartItems();
    }

    function renderCartItems() {
        const itemsContainer =
            document.querySelector(
                "#store-cart-items"
            );

        const subtotalElement =
            document.querySelector(
                "#store-cart-subtotal"
            );

        if (!itemsContainer || !subtotalElement) {
            return;
        }

        const validCartItems =
            state.cart.filter((item) => {
                return Boolean(
                    getProduct(item.productId)
                );
            });

        state.cart = validCartItems;
        saveCart();

        if (state.cart.length === 0) {
            itemsContainer.innerHTML = `
                <div class="store-empty-cart">
                    <div>🛒</div>

                    <h3>Your cart is empty</h3>

                    <p>
                        Add a product to begin your order.
                    </p>
                </div>
            `;

            subtotalElement.textContent =
                "PKR 0.00";

            return;
        }

        itemsContainer.innerHTML = state.cart
            .map((item) => {
                const product = getProduct(
                    item.productId
                );

                const quantity =
                    Number(item.quantity);

                const lineTotal =
                    Number(product.price) *
                    quantity;

                return `
                    <article
                        class="store-cart-item"
                        data-product-id="${product.id}"
                    >
                        <div class="store-cart-item-image">
                            ${escapeHtml(
                                formatCategory(
                                    product.category
                                )
                            )}
                        </div>

                        <div class="store-cart-item-info">
                            <h3>
                                ${escapeHtml(product.name)}
                            </h3>

                            <p>
    ${formatCurrency(Number(product.price))} each
</p>

                            <div class="store-cart-item-bottom">
                                <div class="store-quantity-control">
                                    <button
                                        type="button"
                                        data-action="decrease"
                                        data-product-id="${product.id}"
                                    >
                                        −
                                    </button>

                                    <span>
                                        ${quantity}
                                    </span>

                                    <button
                                        type="button"
                                        data-action="increase"
                                        data-product-id="${product.id}"
                                    >
                                        +
                                    </button>
                                </div>

                                <strong>
                                    ${formatCurrency(lineTotal)}
                                </strong>
                            </div>
                        </div>

                        <button
                            type="button"
                            class="store-remove-item"
                            data-action="remove"
                            data-product-id="${product.id}"
                            aria-label="Remove ${escapeHtml(
                                product.name
                            )}"
                        >
                            ×
                        </button>
                    </article>
                `;
            })
            .join("");

       subtotalElement.textContent = formatCurrency(getCartSubtotal());

        bindCartItemButtons();
    }

    function bindCartItemButtons() {
        document
            .querySelectorAll(
                "[data-action][data-product-id]"
            )
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        const productId = Number(
                            button.dataset.productId
                        );

                        const action =
                            button.dataset.action;

                        if (action === "increase") {
                            changeQuantity(
                                productId,
                                1
                            );
                        }

                        if (action === "decrease") {
                            changeQuantity(
                                productId,
                                -1
                            );
                        }

                        if (action === "remove") {
                            removeFromCart(
                                productId
                            );
                        }
                    }
                );
            });
    }

    function proceedToCheckout() {
        if (state.cart.length === 0) {
            showStoreMessage(
                "Your cart is empty."
            );
            return;
        }

        window.location.href = "/checkout";
    }

    // ========================================================
    // Navigation
    // ========================================================

    function bindNavigation() {
        elements.navigationLinks.forEach(
            (link) => {
                link.addEventListener(
                    "click",
                    () => {
                        if (elements.menuToggle) {
                            elements.menuToggle.checked =
                                false;
                        }
                    }
                );
            }
        );

        document.addEventListener(
            "keydown",
            (event) => {
                if (event.key === "Escape") {
                    closeCartDrawer();
                }
            }
        );
    }

    // ========================================================
    // Helpers
    // ========================================================

    function getBadge(index) {
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

    function formatCategory(category) {
        return String(category || "Product")
            .replaceAll("-", " ")
            .replace(/\b\w/g, (letter) =>
                letter.toUpperCase()
            );
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function showStoreMessage(message) {
        let toast =
            document.querySelector(
                "#store-message"
            );

        if (!toast) {
            toast =
                document.createElement("div");

            toast.id = "store-message";
            toast.className =
                "store-message";

            document.body.appendChild(toast);
        }

        toast.textContent = message;

        toast.classList.add(
            "store-message-visible"
        );

        window.clearTimeout(
            toast.hideTimer
        );

        toast.hideTimer =
            window.setTimeout(() => {
                toast.classList.remove(
                    "store-message-visible"
                );
            }, 3000);
    }
});