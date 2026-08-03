"use strict";

/*
|--------------------------------------------------------------------------
| AUTO Rubber Hub
| Frontend JavaScript
|--------------------------------------------------------------------------
*/

document.addEventListener("DOMContentLoaded", () => {


    let products = [];


    /*
    const products = [
        {
            id: 1,
            name: "Toyota Corolla Door Seal",
            category: "seals",
            type: "Door Rubber",
            compatibility: "Toyota Corolla 2014–2020",
            price: 24.99,
            oldPrice: 29.99,
            description:
                "Durable door sealing rubber designed to reduce wind noise, water leakage and dust entry."
        },
        {
            id: 2,
            name: "Honda Glass Run Channel",
            category: "seals",
            type: "Window Seal",
            compatibility: "Selected Honda models",
            price: 19.99,
            oldPrice: 23.99,
            description:
                "Flexible weather-resistant glass channel for smoother window movement and improved sealing."
        },
        {
            id: 3,
            name: "Control Arm Bush Kit",
            category: "bushes",
            type: "Suspension",
            compatibility: "Multiple vehicle models",
            price: 34.99,
            oldPrice: 39.99,
            description:
                "Heavy-duty suspension bushes engineered to reduce vibration, movement and road noise."
        },
        {
            id: 4,
            name: "Engine Mounting Rubber",
            category: "mounts",
            type: "Engine Mount",
            compatibility: "Selected Japanese vehicles",
            price: 42.99,
            oldPrice: 49.99,
            description:
                "Strong vibration-control mounting rubber that improves engine stability and driving comfort."
        },

        {
            id: 5,
            name: "Honda Civic Door Bush",
            category: "mounts",
            type: "Engine Mount",
            compatibility: "Selected Japanese vehicles",
            price: 24.99,
            oldPrice: 43.99,
            description:
                "Strong vibration-control mounting rubber that improves engine stability and driving comfort."
        }




        
    ];  */

    const state = {
        cart: loadFromStorage("autoRubberHubCart", []),
        favourites: loadFromStorage("autoRubberHubFavourites", []),
        currentFilter: "all",
        searchQuery: ""
    };

    const elements = {
        body: document.body,
        navbar: document.querySelector(".navbar"),
        menuToggle: document.querySelector("#menu-toggle"),
        navigationLinks: document.querySelectorAll(".nav-link"),
        sections: document.querySelectorAll("main section[id]"),
        cartCount: document.querySelector(".cart-count"),
        cartButton: document.querySelector(".cart-button"),
        searchButton: document.querySelector(
            '.navbar-actions .icon-button[aria-label="Search products"]'
        ),
        addCartButtons: document.querySelectorAll(".add-cart-button"),
        favouriteButtons: document.querySelectorAll(".favorite-button"),
        filterButtons: document.querySelectorAll(".filter-button"),
        productCards: document.querySelectorAll(".product-card"),
        newsletterForm: document.querySelector(".newsletter-form"),
        newsletterInput: document.querySelector("#email")
    };

    initialize();

    function initialize() {
        prepareProductCards();
        createToastContainer();
        createCartDrawer();
        createSearchOverlay();
        createProductModal();
        bindNavigationEvents();
        bindProductEvents();
        bindCartEvents();
        bindFilterEvents();
        bindNewsletterEvents();
        bindGlobalEvents();
        updateCartUI();
        updateFavouriteUI();
        updateActiveNavigation();
    }

    /*
    |--------------------------------------------------------------------------
    | Storage
    |--------------------------------------------------------------------------
    */

    function loadFromStorage(key, fallbackValue) {
        try {
            const savedValue = localStorage.getItem(key);

            if (!savedValue) {
                return fallbackValue;
            }

            const parsedValue = JSON.parse(savedValue);

            return parsedValue ?? fallbackValue;
        } catch (error) {
            console.error(`Unable to load ${key}:`, error);
            return fallbackValue;
        }
    }

    function saveCart() {
        try {
            localStorage.setItem(
                "autoRubberHubCart",
                JSON.stringify(state.cart)
            );
        } catch (error) {
            console.error("Unable to save cart:", error);
        }
    }

    function saveFavourites() {
        try {
            localStorage.setItem(
                "autoRubberHubFavourites",
                JSON.stringify(state.favourites)
            );
        } catch (error) {
            console.error("Unable to save favourites:", error);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Product preparation
    |--------------------------------------------------------------------------
    */

    function prepareProductCards() {
        elements.productCards.forEach((card, index) => {
            const product = products[index];

            if (!product) {
                return;
            }

            card.dataset.productId = String(product.id);
            card.dataset.category = product.category;
            card.dataset.productName = product.name.toLowerCase();

            const addButton = card.querySelector(".add-cart-button");
            const favouriteButton = card.querySelector(".favorite-button");
            const productImageArea = card.querySelector(".product-image-area");
            const heading = card.querySelector("h3");

            if (addButton) {
                addButton.href = "#";
                addButton.dataset.productId = String(product.id);
                addButton.setAttribute(
                    "aria-label",
                    `Add ${product.name} to cart`
                );
            }

            if (favouriteButton) {
                favouriteButton.dataset.productId = String(product.id);
            }

            if (productImageArea) {
                productImageArea.style.cursor = "pointer";
                productImageArea.dataset.productId = String(product.id);
                productImageArea.setAttribute("role", "button");
                productImageArea.setAttribute("tabindex", "0");
                productImageArea.setAttribute(
                    "aria-label",
                    `View details for ${product.name}`
                );
            }

            if (heading) {
                heading.style.cursor = "pointer";
                heading.dataset.productId = String(product.id);
                heading.setAttribute("role", "button");
                heading.setAttribute("tabindex", "0");
            }
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Navigation
    |--------------------------------------------------------------------------
    */

    function bindNavigationEvents() {
        elements.navigationLinks.forEach((link) => {
            link.addEventListener("click", () => {
                closeMobileMenu();
            });
        });

        window.addEventListener(
            "scroll",
            throttle(() => {
                updateActiveNavigation();
                updateNavbarAppearance();
            }, 100)
        );
    }

    function updateActiveNavigation() {
        let currentSectionId = "home";
        const scrollPosition = window.scrollY + 180;

        elements.sections.forEach((section) => {
            if (scrollPosition >= section.offsetTop) {
                currentSectionId = section.id;
            }
        });

        elements.navigationLinks.forEach((link) => {
            const href = link.getAttribute("href");
            link.classList.toggle(
                "active",
                href === `#${currentSectionId}`
            );
        });
    }

    function updateNavbarAppearance() {
        if (!elements.navbar) {
            return;
        }

        elements.navbar.classList.toggle(
            "navbar-scrolled",
            window.scrollY > 40
        );
    }

    function closeMobileMenu() {
        if (elements.menuToggle) {
            elements.menuToggle.checked = false;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Products
    |--------------------------------------------------------------------------
    */

    function bindProductEvents() {
        elements.addCartButtons.forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();

                const productId = Number(button.dataset.productId);

                addToCart(productId);
            });
        });

        elements.favouriteButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const productId = Number(button.dataset.productId);

                toggleFavourite(productId);
            });
        });

        document
            .querySelectorAll(
                ".product-image-area[data-product-id], .product-content h3[data-product-id]"
            )
            .forEach((element) => {
                element.addEventListener("click", () => {
                    openProductModal(Number(element.dataset.productId));
                });

                element.addEventListener("keydown", (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openProductModal(
                            Number(element.dataset.productId)
                        );
                    }
                });
            });
    }

    function getProduct(productId) {
        return products.find((product) => product.id === productId);
    }

    function addToCart(productId) {
        const product = getProduct(productId);

        if (!product) {
            showToast("Product could not be found.", "error");
            return;
        }

        const existingItem = state.cart.find(
            (item) => item.productId === productId
        );

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            state.cart.push({
                productId,
                quantity: 1
            });
        }

        saveCart();
        updateCartUI();
        animateCartButton();
        showToast(`${product.name} added to cart.`, "success");
    }

    function removeFromCart(productId) {
        const product = getProduct(productId);

        state.cart = state.cart.filter(
            (item) => item.productId !== productId
        );

        saveCart();
        updateCartUI();

        if (product) {
            showToast(`${product.name} removed from cart.`, "info");
        }
    }

    function changeCartQuantity(productId, amount) {
        const cartItem = state.cart.find(
            (item) => item.productId === productId
        );

        if (!cartItem) {
            return;
        }

        cartItem.quantity += amount;

        if (cartItem.quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        saveCart();
        updateCartUI();
    }

    function clearCart() {
        if (state.cart.length === 0) {
            showToast("Your cart is already empty.", "info");
            return;
        }

        state.cart = [];
        saveCart();
        updateCartUI();
        showToast("Cart cleared.", "info");
    }

    function getCartQuantity() {
        return state.cart.reduce(
            (total, item) => total + item.quantity,
            0
        );
    }

    function getCartSubtotal() {
        return state.cart.reduce((total, item) => {
            const product = getProduct(item.productId);

            if (!product) {
                return total;
            }

            return total + product.price * item.quantity;
        }, 0);
    }

    function updateCartUI() {
        const quantity = getCartQuantity();

        if (elements.cartCount) {
            elements.cartCount.textContent = String(quantity);
            elements.cartCount.classList.toggle(
                "cart-count-hidden",
                quantity === 0
            );
        }

        renderCartDrawer();
    }

    function animateCartButton() {
        if (!elements.cartButton) {
            return;
        }

        elements.cartButton.classList.remove("cart-button-bounce");

        requestAnimationFrame(() => {
            elements.cartButton.classList.add(
                "cart-button-bounce"
            );
        });

        window.setTimeout(() => {
            elements.cartButton.classList.remove(
                "cart-button-bounce"
            );
        }, 500);
    }

    /*
    |--------------------------------------------------------------------------
    | Cart drawer
    |--------------------------------------------------------------------------
    */

    function createCartDrawer() {
        const overlay = document.createElement("div");
        overlay.className = "cart-overlay";
        overlay.id = "cart-overlay";

        overlay.innerHTML = `
            <aside
                class="cart-drawer"
                id="cart-drawer"
                aria-label="Shopping cart"
                aria-hidden="true"
            >
                <div class="cart-drawer-header">
                    <div>
                        <span class="cart-drawer-kicker">Your selection</span>
                        <h2>Shopping Cart</h2>
                    </div>

                    <button
                        class="cart-close-button"
                        type="button"
                        aria-label="Close shopping cart"
                    >
                        ×
                    </button>
                </div>

                <div class="cart-drawer-content" id="cart-items"></div>

                <div class="cart-drawer-footer">
                    <div class="cart-subtotal">
                        <span>Subtotal</span>
                        <strong id="cart-subtotal">$0.00</strong>
                    </div>

                    <p class="cart-note">
                        Delivery and taxes are calculated during checkout.
                    </p>

                    <button
                        class="primary-button cart-checkout-button"
                        type="button"
                    >
                        Proceed to Checkout
                    </button>

                    <button
                        class="cart-clear-button"
                        type="button"
                    >
                        Clear Cart
                    </button>
                </div>
            </aside>
        `;

        document.body.appendChild(overlay);

        overlay
            .querySelector(".cart-close-button")
            .addEventListener("click", closeCartDrawer);

        overlay
            .querySelector(".cart-clear-button")
            .addEventListener("click", clearCart);

        overlay
            .querySelector(".cart-checkout-button")
            .addEventListener("click", handleCheckout);

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                closeCartDrawer();
            }
        });
    }

    function bindCartEvents() {
        if (elements.cartButton) {
            elements.cartButton.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    openCartDrawer();
                }
            );
        }
    }

    function openCartDrawer() {
        const overlay = document.querySelector("#cart-overlay");
        const drawer = document.querySelector("#cart-drawer");

        if (!overlay || !drawer) {
            return;
        }

        overlay.classList.add("cart-overlay-visible");
        drawer.setAttribute("aria-hidden", "false");
        elements.body.classList.add("no-scroll");
    }

    function closeCartDrawer() {
        const overlay = document.querySelector("#cart-overlay");
        const drawer = document.querySelector("#cart-drawer");

        if (!overlay || !drawer) {
            return;
        }

        overlay.classList.remove("cart-overlay-visible");
        drawer.setAttribute("aria-hidden", "true");
        elements.body.classList.remove("no-scroll");
    }

    function renderCartDrawer() {
        const cartItemsContainer =
            document.querySelector("#cart-items");
        const subtotalElement =
            document.querySelector("#cart-subtotal");

        if (!cartItemsContainer || !subtotalElement) {
            return;
        }

        if (state.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <div class="empty-cart-icon">🛒</div>
                    <h3>Your cart is empty</h3>
                    <p>
                        Add automotive rubber parts to begin your order.
                    </p>
                    <button
                        type="button"
                        class="secondary-button empty-cart-shop-button"
                    >
                        Browse Products
                    </button>
                </div>
            `;

            cartItemsContainer
                .querySelector(".empty-cart-shop-button")
                .addEventListener("click", () => {
                    closeCartDrawer();

                    document
                        .querySelector("#products")
                        ?.scrollIntoView({
                            behavior: "smooth"
                        });
                });
        } else {
            cartItemsContainer.innerHTML = state.cart
                .map((item) => {
                    const product = getProduct(item.productId);

                    if (!product) {
                        return "";
                    }

                    const itemTotal =
                        product.price * item.quantity;

                    return `
                        <article
                            class="cart-item"
                            data-cart-product-id="${product.id}"
                        >
                            <div class="cart-item-visual">
                                <span>${escapeHtml(product.type)}</span>
                            </div>

                            <div class="cart-item-info">
                                <h3>${escapeHtml(product.name)}</h3>
                                <p>${escapeHtml(product.compatibility)}</p>

                                <div class="cart-item-bottom">
                                    <div
                                        class="quantity-control"
                                        aria-label="Quantity control"
                                    >
                                        <button
                                            type="button"
                                            data-cart-action="decrease"
                                            data-product-id="${product.id}"
                                            aria-label="Decrease quantity"
                                        >
                                            −
                                        </button>

                                        <span>${item.quantity}</span>

                                        <button
                                            type="button"
                                            data-cart-action="increase"
                                            data-product-id="${product.id}"
                                            aria-label="Increase quantity"
                                        >
                                            +
                                        </button>
                                    </div>

                                    <strong>
                                        ${formatCurrency(itemTotal)}
                                    </strong>
                                </div>
                            </div>

                            <button
                                class="cart-item-remove"
                                type="button"
                                data-cart-action="remove"
                                data-product-id="${product.id}"
                                aria-label="Remove ${escapeHtml(product.name)}"
                            >
                                ×
                            </button>
                        </article>
                    `;
                })
                .join("");

            cartItemsContainer
                .querySelectorAll("[data-cart-action]")
                .forEach((button) => {
                    button.addEventListener("click", () => {
                        const action =
                            button.dataset.cartAction;
                        const productId = Number(
                            button.dataset.productId
                        );

                        if (action === "increase") {
                            changeCartQuantity(productId, 1);
                        }

                        if (action === "decrease") {
                            changeCartQuantity(productId, -1);
                        }

                        if (action === "remove") {
                            removeFromCart(productId);
                        }
                    });
                });
        }

        subtotalElement.textContent = formatCurrency(
            getCartSubtotal()
        );
    }
/*
    function handleCheckout() {
        if (state.cart.length === 0) {
            showToast(
                "Add at least one product before checkout.",
                "error"
            );
            return;
        }

        showToast(
            "Your frontend checkout is ready. Connect this button to your Python payment route.",
            "info"
        );
    } */

        function handleCheckout() {
    if (state.cart.length === 0) {
        showToast(
            "Add at least one product before checkout.",
            "error"
        );

        return;
    }

    window.location.href = "/checkout";
}

    /*
    |--------------------------------------------------------------------------
    | Favourites
    |--------------------------------------------------------------------------
    */

    function toggleFavourite(productId) {
        const product = getProduct(productId);

        if (!product) {
            return;
        }

        const isFavourite =
            state.favourites.includes(productId);

        if (isFavourite) {
            state.favourites = state.favourites.filter(
                (id) => id !== productId
            );

            showToast(
                `${product.name} removed from favourites.`,
                "info"
            );
        } else {
            state.favourites.push(productId);

            showToast(
                `${product.name} added to favourites.`,
                "success"
            );
        }

        saveFavourites();
        updateFavouriteUI();
    }

    function updateFavouriteUI() {
        elements.favouriteButtons.forEach((button) => {
            const productId = Number(button.dataset.productId);
            const isFavourite =
                state.favourites.includes(productId);

            button.classList.toggle(
                "favorite-button-active",
                isFavourite
            );

            button.setAttribute(
                "aria-pressed",
                String(isFavourite)
            );
        });
    }

    /*
    |--------------------------------------------------------------------------
    | Filters
    |--------------------------------------------------------------------------
    */

    function bindFilterEvents() {
        elements.filterButtons.forEach((button) => {
            button.addEventListener("click", (event) => {
                event.preventDefault();

                const filter =
                    button.textContent.trim().toLowerCase();

                state.currentFilter =
                    filter === "all" ? "all" : filter;

                elements.filterButtons.forEach(
                    (filterButton) => {
                        filterButton.classList.toggle(
                            "active",
                            filterButton === button
                        );
                    }
                );

                applyProductFilters();
            });
        });
    }

    function applyProductFilters() {
        let visibleCount = 0;

        elements.productCards.forEach((card) => {
            const matchesCategory =
                state.currentFilter === "all" ||
                card.dataset.category === state.currentFilter;

            const productName =
                card.dataset.productName || "";

            const product = getProduct(
                Number(card.dataset.productId)
            );

            const searchableText = [
                productName,
                product?.type,
                product?.compatibility,
                product?.description
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                state.searchQuery === "" ||
                searchableText.includes(state.searchQuery);

            const shouldDisplay =
                matchesCategory && matchesSearch;

            card.classList.toggle(
                "product-hidden",
                !shouldDisplay
            );

            if (shouldDisplay) {
                visibleCount += 1;
            }
        });

        updateNoResultsMessage(visibleCount);
    }

    function updateNoResultsMessage(visibleCount) {
        const grid = document.querySelector(".product-grid");

        if (!grid) {
            return;
        }

        let noResults =
            document.querySelector(".product-no-results");

        if (visibleCount === 0) {
            if (!noResults) {
                noResults = document.createElement("div");
                noResults.className = "product-no-results";
                noResults.innerHTML = `
                    <div>🔍</div>
                    <h3>No products found</h3>
                    <p>
                        Try another search phrase or category.
                    </p>
                `;

                grid.insertAdjacentElement(
                    "afterend",
                    noResults
                );
            }

            noResults.hidden = false;
        } else if (noResults) {
            noResults.hidden = true;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    function createSearchOverlay() {
        const searchOverlay = document.createElement("div");

        searchOverlay.className = "search-overlay";
        searchOverlay.id = "search-overlay";

        searchOverlay.innerHTML = `
            <div
                class="search-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="search-title"
            >
                <div class="search-dialog-header">
                    <div>
                        <span>Find your part</span>
                        <h2 id="search-title">Search Products</h2>
                    </div>

                    <button
                        type="button"
                        class="search-close-button"
                        aria-label="Close search"
                    >
                        ×
                    </button>
                </div>

                <label
                    for="product-search-input"
                    class="visually-hidden"
                >
                    Search automotive products
                </label>

                <div class="search-input-wrapper">
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"
                        ></path>
                    </svg>

                    <input
                        id="product-search-input"
                        type="search"
                        placeholder="Search seals, bushes, mounts..."
                        autocomplete="off"
                    >
                </div>

                <div
                    class="search-suggestions"
                    id="search-suggestions"
                ></div>
            </div>
        `;

        document.body.appendChild(searchOverlay);

        const closeButton =
            searchOverlay.querySelector(
                ".search-close-button"
            );

        const searchInput =
            searchOverlay.querySelector(
                "#product-search-input"
            );

        closeButton.addEventListener(
            "click",
            closeSearchOverlay
        );

        searchOverlay.addEventListener("click", (event) => {
            if (event.target === searchOverlay) {
                closeSearchOverlay();
            }
        });

        searchInput.addEventListener("input", () => {
            renderSearchSuggestions(
                searchInput.value.trim()
            );
        });
    }

    function bindGlobalEvents() {
        if (elements.searchButton) {
            elements.searchButton.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();
                    openSearchOverlay();
                }
            );
        }

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeSearchOverlay();
                closeCartDrawer();
                closeProductModal();
                closeMobileMenu();
            }
        });
    }

    function openSearchOverlay() {
        const overlay =
            document.querySelector("#search-overlay");
        const input =
            document.querySelector(
                "#product-search-input"
            );

        if (!overlay || !input) {
            return;
        }

        overlay.classList.add("search-overlay-visible");
        elements.body.classList.add("no-scroll");

        renderSearchSuggestions("");

        window.setTimeout(() => {
            input.focus();
        }, 150);
    }

    function closeSearchOverlay() {
        const overlay =
            document.querySelector("#search-overlay");

        if (!overlay) {
            return;
        }

        overlay.classList.remove(
            "search-overlay-visible"
        );
        elements.body.classList.remove("no-scroll");
    }

    function renderSearchSuggestions(query) {
        const suggestions =
            document.querySelector(
                "#search-suggestions"
            );

        if (!suggestions) {
            return;
        }

        const normalizedQuery =
            query.toLowerCase();

        const results = products.filter((product) => {
            const text = [
                product.name,
                product.category,
                product.type,
                product.compatibility,
                product.description
            ]
                .join(" ")
                .toLowerCase();

            return (
                normalizedQuery === "" ||
                text.includes(normalizedQuery)
            );
        });

        if (results.length === 0) {
            suggestions.innerHTML = `
                <div class="search-empty">
                    No matching products were found.
                </div>
            `;
            return;
        }

        suggestions.innerHTML = results
            .map(
                (product) => `
                    <button
                        type="button"
                        class="search-result"
                        data-search-product-id="${product.id}"
                    >
                        <span class="search-result-icon">
                            ${escapeHtml(product.type.charAt(0))}
                        </span>

                        <span class="search-result-info">
                            <strong>
                                ${escapeHtml(product.name)}
                            </strong>
                            <small>
                                ${escapeHtml(product.compatibility)}
                            </small>
                        </span>

                        <span class="search-result-price">
                            ${formatCurrency(product.price)}
                        </span>
                    </button>
                `
            )
            .join("");

        suggestions
            .querySelectorAll("[data-search-product-id]")
            .forEach((button) => {
                button.addEventListener("click", () => {
                    const productId = Number(
                        button.dataset.searchProductId
                    );

                    state.searchQuery = query
                        .trim()
                        .toLowerCase();

                    closeSearchOverlay();

                    document
                        .querySelector("#products")
                        ?.scrollIntoView({
                            behavior: "smooth"
                        });

                    applyProductFilters();

                    window.setTimeout(() => {
                        openProductModal(productId);
                    }, 500);
                });
            });
    }

    /*
    |--------------------------------------------------------------------------
    | Product modal
    |--------------------------------------------------------------------------
    */

    function createProductModal() {
        const modal = document.createElement("div");

        modal.className = "product-modal-overlay";
        modal.id = "product-modal-overlay";

        modal.innerHTML = `
            <div
                class="product-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-modal-title"
            >
                <button
                    type="button"
                    class="product-modal-close"
                    aria-label="Close product details"
                >
                    ×
                </button>

                <div
                    class="product-modal-visual"
                    id="product-modal-visual"
                >
                    AUTO RUBBER HUB
                </div>

                <div class="product-modal-content">
                    <span id="product-modal-type"></span>

                    <h2 id="product-modal-title"></h2>

                    <p
                        class="product-modal-compatibility"
                        id="product-modal-compatibility"
                    ></p>

                    <p
                        class="product-modal-description"
                        id="product-modal-description"
                    ></p>

                    <div class="product-modal-price">
                        <strong id="product-modal-price"></strong>
                        <del id="product-modal-old-price"></del>
                    </div>

                    <button
                        type="button"
                        class="primary-button product-modal-cart-button"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal
            .querySelector(".product-modal-close")
            .addEventListener(
                "click",
                closeProductModal
            );

        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeProductModal();
            }
        });
    }

    function openProductModal(productId) {
        const product = getProduct(productId);
        const overlay =
            document.querySelector(
                "#product-modal-overlay"
            );

        if (!product || !overlay) {
            return;
        }

        overlay.querySelector(
            "#product-modal-type"
        ).textContent = product.type;

        overlay.querySelector(
            "#product-modal-title"
        ).textContent = product.name;

        overlay.querySelector(
            "#product-modal-compatibility"
        ).textContent = product.compatibility;

        overlay.querySelector(
            "#product-modal-description"
        ).textContent = product.description;

        overlay.querySelector(
            "#product-modal-price"
        ).textContent = formatCurrency(product.price);

        overlay.querySelector(
            "#product-modal-old-price"
        ).textContent = formatCurrency(product.oldPrice);

        const addButton = overlay.querySelector(
            ".product-modal-cart-button"
        );

        addButton.onclick = () => {
            addToCart(product.id);
            closeProductModal();
        };

        overlay.classList.add(
            "product-modal-overlay-visible"
        );

        elements.body.classList.add("no-scroll");
    }

    function closeProductModal() {
        const overlay =
            document.querySelector(
                "#product-modal-overlay"
            );

        if (!overlay) {
            return;
        }

        overlay.classList.remove(
            "product-modal-overlay-visible"
        );

        elements.body.classList.remove("no-scroll");
    }

    /*
    |--------------------------------------------------------------------------
    | Newsletter
    |--------------------------------------------------------------------------
    */

    function bindNewsletterEvents() {
        if (
            !elements.newsletterForm ||
            !elements.newsletterInput
        ) {
            return;
        }

        elements.newsletterForm.addEventListener(
            "submit",
            (event) => {
                event.preventDefault();

                const email =
                    elements.newsletterInput.value.trim();

                if (!isValidEmail(email)) {
                    showToast(
                        "Please enter a valid email address.",
                        "error"
                    );

                    elements.newsletterInput.focus();
                    return;
                }

                const subscribers = loadFromStorage(
                    "autoRubberHubSubscribers",
                    []
                );

                if (subscribers.includes(email)) {
                    showToast(
                        "This email is already subscribed.",
                        "info"
                    );
                    return;
                }

                subscribers.push(email);

                try {
                    localStorage.setItem(
                        "autoRubberHubSubscribers",
                        JSON.stringify(subscribers)
                    );
                } catch (error) {
                    console.error(
                        "Unable to save subscriber:",
                        error
                    );
                }

                elements.newsletterForm.reset();

                showToast(
                    "Thank you for subscribing!",
                    "success"
                );
            }
        );
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(
            email
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Toast notifications
    |--------------------------------------------------------------------------
    */

    function createToastContainer() {
        if (document.querySelector(".toast-container")) {
            return;
        }

        const container = document.createElement("div");
        container.className = "toast-container";
        container.setAttribute(
            "aria-live",
            "polite"
        );

        document.body.appendChild(container);
    }

    function showToast(message, type = "info") {
        const container =
            document.querySelector(".toast-container");

        if (!container) {
            return;
        }

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;

        toast.innerHTML = `
            <span class="toast-indicator"></span>
            <span class="toast-message">
                ${escapeHtml(message)}
            </span>
            <button
                type="button"
                class="toast-close"
                aria-label="Close notification"
            >
                ×
            </button>
        `;

        container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("toast-visible");
        });

        const removeToast = () => {
            toast.classList.remove("toast-visible");

            window.setTimeout(() => {
                toast.remove();
            }, 300);
        };

        toast
            .querySelector(".toast-close")
            .addEventListener(
                "click",
                removeToast
            );

        window.setTimeout(removeToast, 3500);
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    function formatCurrency(value) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD"
        }).format(value);
    }

    function escapeHtml(value) {
        const div = document.createElement("div");
        div.textContent = String(value);
        return div.innerHTML;
    }

    function throttle(callback, delay) {
        let waiting = false;

        return (...args) => {
            if (waiting) {
                return;
            }

            waiting = true;

            callback(...args);

            window.setTimeout(() => {
                waiting = false;
            }, delay);
        };
    }
});