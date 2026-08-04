"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(
        "#special-order-form"
    );

    const imageInput = document.querySelector(
        "#product-image"
    );

    const previewContainer =
        document.querySelector(
            "#image-preview-container"
        );

    const previewImage = document.querySelector(
        "#image-preview"
    );

    const messageElement =
        document.querySelector(
            "#special-order-message"
        );

    const submitButton =
        document.querySelector(
            "#special-order-button"
        );

    imageInput.addEventListener(
        "change",
        previewSelectedImage
    );

    form.addEventListener(
        "submit",
        submitSpecialOrder
    );

    function previewSelectedImage() {
        const file = imageInput.files[0];

        if (!file) {
            previewContainer.hidden = true;
            previewImage.removeAttribute("src");

            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            imageInput.value = "";
            previewContainer.hidden = true;

            showMessage(
                "The selected image must be 5 MB or smaller.",
                "error"
            );

            return;
        }

        previewImage.src =
            URL.createObjectURL(file);

        previewContainer.hidden = false;

        showMessage("", "");
    }

    async function submitSpecialOrder(event) {
        event.preventDefault();

        setSubmitting(true);
        showMessage("", "");

        try {
            const formData =
                new FormData(form);

            const response = await fetch(
                "/api/special-orders",
                {
                    method: "POST",
                    body: formData
                }
            );

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message
                    || "The request could not be submitted."
                );
            }

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
                ? "Submitting..."
                : "Submit Part Request";
    }

    function showMessage(
        message,
        type
    ) {
        messageElement.textContent = message;

        messageElement.className =
            type
                ? `form-message ${type}`
                : "form-message";
    }
});