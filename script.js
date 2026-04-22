/*
  ============================================================================
  BookHaven - Minimal JavaScript (Beginner Friendly)
  ============================================================================

  What this file does:
  1) On catalog page:
     - When user clicks "Add to Cart", that book is stored in browser localStorage.
     - If same book is added again, quantity is increased.

  2) On cart page:
     - Reads saved books from localStorage.
     - Builds cart rows dynamically.
     - Handles + (increase), - (decrease), and Remove actions.
     - Updates subtotal, item count, and final total.

  Why localStorage?
  - localStorage keeps data in browser even after refresh.
  - So items added in catalog can appear later in cart page.
*/

// A fixed key name used to store and read cart data from localStorage.
const STORAGE_KEY = "bookhaven_cart";

// Read cart from localStorage.
// If nothing is stored yet, return empty array [].
// localStorage stores only text, so we convert JSON text -> JS array/object.
function getCart() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

// Save updated cart array into localStorage.
// Convert JS array/object -> JSON text before saving.
function setCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

// Convert a price string like "₹18.99" into number 18.99.
// We remove everything except digits and decimal point.
function toPrice(text) {
  return Number(String(text).replace(/[^\d.]/g, "")) || 0;
}

// Create a simple unique id from title.
// Example: "Think Better Daily" -> "think-better-daily"
// This helps identify same book when adding/removing/updating quantity.
function toId(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Format a number as rupee currency text.
// Example: 18.9 -> "₹18.90"
function money(value) {
  return "₹" + Number(value).toFixed(2);
}

/*
  ----------------------------------------------------------------------------
  CATALOG PAGE LOGIC
  ----------------------------------------------------------------------------
*/

// Select all "Add to Cart" buttons.
// If page is not catalog page, this list will be empty.
const addButtons = document.querySelectorAll(".add-to-cart-btn");
if (addButtons.length) {
  function getCategoryFromCard(card) {
    if (card.classList.contains("cat-fiction")) return "Fiction";
    if (card.classList.contains("cat-non-fiction")) return "Non-Fiction";
    if (card.classList.contains("cat-self-help")) return "Self-Help";
    if (card.classList.contains("cat-academic")) return "Academic";
    return "Biographies";
  }

  function getBookFromCard(card) {
    const title = card.querySelector("h3").textContent.trim();
    return {
      id: toId(title),
      title: title,
      price: toPrice(card.querySelector(".price").textContent),
      image: card.querySelector("img").src,
      category: getCategoryFromCard(card),
    };
  }

  function updateCardControls(card) {
    const book = getBookFromCard(card);
    const addBtn = card.querySelector(".add-to-cart-btn");
    const qtyWrap = card.querySelector(".catalog-qty-control");
    const qtyValue = card.querySelector(".catalog-qty-value");
    const cart = getCart();
    const item = cart.find((x) => x.id === book.id);
    const qty = item ? item.qty : 0;

    qtyValue.textContent = String(qty);
    if (qty > 0) {
      addBtn.classList.add("hide");
      qtyWrap.classList.add("show");
    } else {
      addBtn.classList.remove("hide");
      qtyWrap.classList.remove("show");
    }
  }

  function buildQtyControlIfMissing(card) {
    if (card.querySelector(".catalog-qty-control")) return;
    const addBtn = card.querySelector(".add-to-cart-btn");
    const qtyWrap = document.createElement("div");
    qtyWrap.className = "catalog-qty-control";
    qtyWrap.innerHTML =
      '<button type="button" class="qty-btn catalog-qty-minus">-</button>' +
      '<span class="qty-chip catalog-qty-value">0</span>' +
      '<button type="button" class="qty-btn catalog-qty-plus">+</button>';
    addBtn.insertAdjacentElement("afterend", qtyWrap);
  }

  // For each button, attach click event.
  addButtons.forEach((btn) => {
    const card = btn.closest(".book-card");
    if (!card) return;
    buildQtyControlIfMissing(card);
    const minusBtn = card.querySelector(".catalog-qty-minus");
    const plusBtn = card.querySelector(".catalog-qty-plus");

    btn.addEventListener("click", (event) => {
      // Extra safety: stop any default action/navigation.
      event.preventDefault();
      event.stopPropagation();

      // Find the nearest parent .book-card (the book that user clicked).
      const book = getBookFromCard(card);
      const cart = getCart();
      const item = cart.find((x) => x.id === book.id);
      if (item) item.qty += 1;
      else cart.push({ ...book, qty: 1 });
      setCart(cart);
      updateCardControls(card);
    });

    plusBtn.addEventListener("click", () => {
      const book = getBookFromCard(card);
      const cart = getCart();
      const item = cart.find((x) => x.id === book.id);
      if (item) item.qty += 1;
      else cart.push({ ...book, qty: 1 });
      setCart(cart);
      updateCardControls(card);
    });

    minusBtn.addEventListener("click", () => {
      const book = getBookFromCard(card);
      let cart = getCart();
      const item = cart.find((x) => x.id === book.id);
      if (!item) return;
      if (item.qty > 1) item.qty -= 1;
      else cart = cart.filter((x) => x.id !== book.id);
      setCart(cart);
      updateCardControls(card);
    });

    updateCardControls(card);
  });
}

/*
  ----------------------------------------------------------------------------
  CART PAGE LOGIC
  ----------------------------------------------------------------------------
*/

// This table body exists only on cart page.
// If not found, skip cart logic.
const tbody = document.getElementById("cart-table-body");
if (tbody) {
  // Fixed values for bill calculation.
  const SHIPPING = 0;
  const DISCOUNT = 6.64;

  // Get summary section elements.
  const itemCountEl = document.getElementById("cart-item-count");
  const subtotalEl = document.getElementById("summary-subtotal");
  const shippingEl = document.getElementById("summary-shipping");
  const discountEl = document.getElementById("summary-discount");
  const totalEl = document.getElementById("summary-total");

  // Load current cart into memory.
  let cart = getCart();

  /*
    render()
    - Rebuilds the entire table body from current cart array.
    - Also recalculates subtotal, total items, and final total.
    - Called initially and after every + / - / remove action.
  */
  function render() {
    // If cart is empty, show message row and set all summary values.
    if (!cart.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="cart-empty">Your cart is empty. Add books from catalog.</td></tr>';
      itemCountEl.textContent = "0";
      subtotalEl.textContent = money(0);
      shippingEl.textContent = money(SHIPPING);
      discountEl.textContent = "- " + money(DISCOUNT);
      totalEl.textContent = money(0);
      return;
    }

    // Start fresh counters.
    let subtotal = 0;
    let itemCount = 0;

    // Build table rows from cart data.
    // map() creates one HTML block per book item.
    tbody.innerHTML = cart
      .map((item) => {
        // Row total = price * quantity
        const line = item.price * item.qty;

        // Update summary counters.
        subtotal += line;
        itemCount += item.qty;

        // Return one table row as HTML string.
        return `
          <tr class="cart-row" data-id="${item.id}">
            <td>
              <div class="cart-book">
                <img src="${item.image}" alt="${item.title} book cover" />
                <div><h3>${item.title}</h3><p>${item.category}</p></div>
              </div>
            </td>
            <td>${money(item.price)}</td>
            <td>
              <div class="qty-control">
                <button type="button" class="qty-btn qty-minus">-</button>
                <span class="qty-chip qty-value">${item.qty}</span>
                <button type="button" class="qty-btn qty-plus">+</button>
              </div>
            </td>
            <td class="line-total">${money(line)}</td>
            <td><button type="button" class="remove-btn remove-row-btn">Remove</button></td>
          </tr>
        `;
      })
      .join("");

    // Update summary values on right side.
    itemCountEl.textContent = String(itemCount);
    subtotalEl.textContent = money(subtotal);
    shippingEl.textContent = money(SHIPPING);
    discountEl.textContent = "- " + money(DISCOUNT);

    // Total cannot go below 0.
    totalEl.textContent = money(Math.max(subtotal - DISCOUNT, 0));
  }

  /*
    Single event listener for all row buttons (event delegation):
    - Efficient: we don't add separate listeners to every + / - / Remove button.
    - Works even after rows are re-rendered.
  */
  tbody.addEventListener("click", (e) => {
    // Find the clicked row.
    const row = e.target.closest(".cart-row");
    if (!row) return;

    // Get row's book id and find same item in cart array.
    const id = row.dataset.id;
    const item = cart.find((x) => x.id === id);
    if (!item) return;

    // + button: increase quantity.
    if (e.target.classList.contains("qty-plus")) item.qty += 1;

    // - button: if qty is 1, remove item; else decrease by 1.
    if (e.target.classList.contains("qty-minus")) {
      if (item.qty > 1) item.qty -= 1;
      else cart = cart.filter((x) => x.id !== id);
    }

    // Remove button: remove that item completely from cart array.
    if (e.target.classList.contains("remove-row-btn")) cart = cart.filter((x) => x.id !== id);

    // Save and refresh UI.
    setCart(cart);
    render();
  });

  // Initial render when cart page loads.
  render();
}


/* =========================
   Register Validation
========================= */

function validateRegister() {

  let name = document.getElementById("name").value;
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;
  let confirm = document.getElementById("confirm").value;

  // Empty check
  if (name === "" || email === "" || password === "" || confirm === "") {
    alert("All fields are required!");
    return false;
  }

  // Email basic check
  if (!email.includes("@") || !email.includes(".")) {
    alert("Enter a valid email!");
    return false;
  }

  // Password length check
  if (password.length < 6) {
    alert("Password must be at least 6 characters");
    return false;
  }

  // Match check
  if (password !== confirm) {
    alert("Passwords do not match!");
    return false;
  }

  alert("Registration Successful!");
  return true;
}



/* =========================
   Login Validation
========================= */

function validateLogin() {

  let email = document.getElementById("loginEmail").value;
  let password = document.getElementById("loginPass").value;

  if (email === "" || password === "") {
    alert("Please fill all fields!");
    return false;
  }

  if (!email.includes("@") || !email.includes(".")) {
    alert("Invalid email format!");
    return false;
  }

  alert("Login Successful!");
  return true;
}


/* =========================
   Payment Validation
========================= */

function validatePayment() {

  let holder = document.getElementById("holder").value;
  let card = document.getElementById("card").value;
  let expiry = document.getElementById("expiry").value;
  let cvv = document.getElementById("cvv").value;

  // Empty check
  if (holder === "" || card === "" || expiry === "" || cvv === "") {
    alert("All fields are required!");
    return false;
  }

  // Card number check (length + digits)
  if (card.length !== 16) {
    alert("Card number must be 16 digits!");
    return false;
  }

  for (let i = 0; i < card.length; i++) {
    if (card[i] < '0' || card[i] > '9') {
      alert("Card must contain only numbers!");
      return false;
    }
  }

  // Expiry check (MM/YY format)
  if (expiry.length !== 5 || expiry[2] !== "/") {
    alert("Expiry must be in MM/YY format");
    return false;
  }

  let month = expiry.substring(0, 2);
  let year = expiry.substring(3, 5);

  if (month < "01" || month > "12") {
    alert("Invalid month in expiry!");
    return false;
  }

  // CVV check
  if (cvv.length !== 3) {
    alert("CVV must be 3 digits!");
    return false;
  }

  for (let i = 0; i < cvv.length; i++) {
    if (cvv[i] < '0' || cvv[i] > '9') {
      alert("CVV must be numeric!");
      return false;
    }
  }

  alert("Payment Successful!");
  window.location.href = "confirmation.html";
  return false;
}