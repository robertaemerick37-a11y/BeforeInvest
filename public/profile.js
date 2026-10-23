document.addEventListener("DOMContentLoaded", async () => {
  localStorage.removeItem("token");

  let user;
  try {
    const sessionResponse = await fetch("/api/profile/me");
    if (!sessionResponse.ok) throw new Error("Session is invalid or expired.");
    user = await sessionResponse.json();
  } catch {
    localStorage.removeItem("userRole");
    window.location.replace("login.html");
    return;
  }

  try {
    const legacyUser = JSON.parse(localStorage.getItem("kbiUser") || "null");
    if (legacyUser?.email?.toLowerCase() === user.email?.toLowerCase()) {
      const legacyFields = [
        "fullName", "phone", "secretQuestion", "secretAnswer", "sex", "dateOfBirth",
        "nationality", "birthCountry", "townOfBirth", "occupation", "incomeBand",
      ];
      const legacyProfile = Object.fromEntries(
        legacyFields.filter((field) => typeof legacyUser[field] === "string").map((field) => [field, legacyUser[field]]),
      );
      if (Object.keys(legacyProfile).length) {
        const migrationResponse = await fetch("/api/profile/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(legacyProfile),
        });
        if (!migrationResponse.ok) throw new Error("Legacy profile migration failed.");
        user = await migrationResponse.json();
      }
    }
    localStorage.removeItem("kbiUser");
  } catch (error) {
    console.warn("Legacy profile migration will be retried after sign-in:", error);
  }

  function initialsFrom(name, email) {
    const source = (name || "").trim();
    if (source) {
      const parts = source.split(/\s+/).filter(Boolean);
      const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
      return letters.toUpperCase();
    }
    return (email || "?").slice(0, 2).toUpperCase();
  }

  function formatDate(iso) {
    const date = iso ? new Date(iso) : new Date();
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }

  const set = (selector, value) => {
    document.querySelectorAll(selector).forEach((el) => {
      el.textContent = value;
    });
  };

  const displayName = user.fullName || "there";
  set("[data-greeting]", user.fullName ? `Welcome back, ${user.fullName.split(" ")[0]}` : "Welcome back");
  set("[data-name]", user.fullName || "Unnamed account");
  set("[data-email]", user.email || "—");
  set("[data-phone]", user.phone || "—");
  set("[data-member-since]", formatDate(user.memberSince));
  set("[data-initials]", initialsFrom(user.fullName, user.email));
  set('[data-field="name"]', user.fullName || "—");
  set('[data-field="email"]', user.email || "—");
  set('[data-field="phone"]', user.phone || "—");

  const historyBody = document.querySelector("#settings-history-body");
  const historyStatus = document.querySelector("#settings-history-status");
  const historyWrap = document.querySelector("#settings-history-wrap");

  async function loadTransactionHistory() {
    if (!historyBody || !historyStatus || !historyWrap) return;
    historyStatus.hidden = false;
    historyStatus.textContent = "Loading history...";
    historyWrap.hidden = true;

    try {
      const response = await fetch("/api/profile/me/transactions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load history.");

      const rows = (data.transactions || []).map((transaction) => {
        const row = document.createElement("tr");
        const values = [
          { value: transaction.type, className: "settings-history-type" },
          { value: `${transaction.assetName} (${transaction.assetSymbol})` },
          { value: transaction.quantity },
          { value: formatCurrency(transaction.total, transaction.currency) },
          { value: transaction.currency },
          { value: new Date(transaction.createdAt).toLocaleString() },
        ];
        values.forEach(({ value, className = "" }) => {
          const cell = document.createElement("td");
          cell.className = className;
          cell.textContent = String(value);
          row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `settings-history-status-badge${transaction.status === "Completed" ? " settings-history-status-badge--completed" : ""}`;
        badge.textContent = transaction.status;
        statusCell.appendChild(badge);
        row.appendChild(statusCell);
        return row;
      });

      historyBody.replaceChildren(...rows);
      historyWrap.hidden = rows.length === 0;
      historyStatus.hidden = rows.length > 0;
      if (!rows.length) historyStatus.textContent = "No purchase history yet.";
    } catch (error) {
      historyStatus.hidden = false;
      historyStatus.textContent = error.message || "Could not load purchase history.";
    }
  }

  loadTransactionHistory();

  const settingsForm = document.querySelector("#profile-information-form");
  if (settingsForm) {
    ["fullName", "email", "phone", "sex", "dateOfBirth"].forEach((field) => {
      const input = settingsForm.elements.namedItem(field);
      if (input) input.value = user[field] || "";
    });

    settingsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(settingsForm);
      const updates = {};
      ["fullName", "phone", "sex", "dateOfBirth"].forEach((field) => {
        updates[field] = String(formData.get(field) || "").trim();
      });
      const status = document.querySelector("#profile-form-status");
      const submitButton = settingsForm.querySelector('[type="submit"]');
      submitButton.disabled = true;
      status.textContent = "Saving securely...";

      try {
        const response = await fetch("/api/profile/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        const updatedUser = await response.json();
        if (!response.ok) throw new Error(updatedUser.error || "Profile update failed.");
        Object.assign(user, updatedUser);
        set("[data-name]", user.fullName || "Unnamed account");
        set("[data-phone]", user.phone || "—");
        set("[data-initials]", initialsFrom(user.fullName, user.email));
        set("[data-greeting]", user.fullName ? `Welcome back, ${user.fullName.split(" ")[0]}` : "Welcome back");
        status.textContent = "Your information has been updated securely.";
      } catch (error) {
        status.textContent = error.message || "Could not save your information. Please try again.";
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  // ---- Edit buttons: no editing yet, just surface a short note ----
  document.querySelectorAll("[data-edit-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const note = document.querySelector(`[data-edit-note="${btn.dataset.editToggle}"]`);
      note?.classList.toggle("is-visible");
    });
  });

  // ---- Balance visibility toggle ----
  // Balances start masked when the page loads; the eye toggle reveals them
  // with a short blur/fade swap, and the eye icon itself cross-fades
  // between its open/closed states (see .ov-eye-toggle rules in the CSS).
  const money = (value) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));

  // Each eye controls its own group of figures, so hiding the balance on the
  // overview card does not touch the crypto page cards (and vice versa).
  function setupBalanceToggle(toggleSelector, elementsSelector) {
    const els = document.querySelectorAll(elementsSelector);
    const toggle = document.querySelector(toggleSelector);
    let hidden = true;

    const realText = new Map();
    els.forEach((el) => {
      const isDeposit = el.hasAttribute("data-deposited") || el.hasAttribute("data-acct-deposited");
      realText.set(el, money(isDeposit ? user.deposited : user.balance));
    });

    const apply = () => {
      els.forEach((el) => {
        el.textContent = hidden ? "••••••" : realText.get(el);
      });
    };

    // Set the initial state instantly (no transition) so the page doesn't
    // flash the real numbers before masking them.
    apply();
    toggle?.classList.toggle("is-revealed", !hidden);

    toggle?.addEventListener("click", () => {
      hidden = !hidden;
      toggle.classList.toggle("is-revealed", !hidden);
      els.forEach((el) => el.classList.add("is-swapping"));
      window.setTimeout(() => {
        apply();
        els.forEach((el) => el.classList.remove("is-swapping"));
      }, 140);
    });
  }

  setupBalanceToggle("[data-balance-toggle]", "[data-balance], [data-deposited]");
  setupBalanceToggle("[data-acct-toggle]", "[data-acct-balance], [data-acct-deposited]");

  // Tier is a plain label (no masking)
  document.querySelectorAll("[data-tier]").forEach((el) => {
    el.textContent = user.tier || "Standard";
  });

  // Tier level bar: lowest tier = empty, highest tier = full, evenly spaced
  // in between. Keep this list in the same order as the admin dropdown.
  const TIER_LEVELS = ["Standard", "Silver", "Gold"];
  const tierIndex = Math.max(0, TIER_LEVELS.indexOf(user.tier || "Standard"));
  const tierPercent = Math.round((tierIndex / (TIER_LEVELS.length - 1)) * 100);
  document.querySelectorAll("[data-tier-bar]").forEach((bar) => {
    bar.setAttribute("aria-valuenow", String(tierPercent));
    bar.setAttribute("aria-valuetext", `${user.tier || "Standard"} tier`);
    const fill = bar.querySelector("[data-tier-fill]");
    if (fill) requestAnimationFrame(() => { fill.style.width = `${tierPercent}%`; });
  });

  // List of changes behind the numbers, each with its reason
  (async function loadAccountHistory() {
    const list = document.querySelector("[data-acct-history]");
    if (!list) return;
    try {
      const response = await fetch("/api/profile/me/account", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.history) || !data.history.length) return;

      const labels = { balance: "Wallet balance", deposited: "Deposited", tier: "Tier" };
      const money = (value) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);

      list.replaceChildren();
      data.history.forEach((entry) => {
        const item = document.createElement("li");
        const isTier = entry.field === "tier";
        const change = isTier
          ? `${entry.from} → ${entry.to}`
          : `${money(entry.from)} → ${money(entry.to)}`;
        const when = new Date(entry.createdAt.replace(" ", "T") + "Z").toLocaleDateString();
        const head = document.createElement("strong");
        head.textContent = `${labels[entry.field] || "Update"}: ${change}`;
        const meta = document.createElement("span");
        meta.textContent = `${when} · ${entry.reason}${entry.txHash ? ` · Tx ${entry.txHash}` : ""}`;
        item.append(head, meta);
        list.appendChild(item);
      });
    } catch {
      /* leave the empty message */
    }
  })();

  // ---- Overview / Settings view toggle ----
  // "Settings" isn't a separate page — it just swaps which section of this
  // same profile screen is visible.
  const viewLinks = document.querySelectorAll("[data-view-toggle]");
  const viewSections = document.querySelectorAll("[data-view]:not(a)");

  function hasView(view) {
    return Array.from(viewSections).some((section) => section.dataset.view === view);
  }

  function showView(view) {
    viewSections.forEach((section) => {
      section.classList.toggle("is-hidden", section.dataset.view !== view);
    });
    viewLinks.forEach((link) => {
      const isMatch = link.dataset.viewToggle === view;
      link.classList.toggle("is-active", isMatch);
      if (isMatch) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  viewLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const view = link.dataset.viewToggle;
      // Some nav items (Crypto & Markets, Metals, Stocks) don't have a
      // built-out section yet — show a toast instead of swapping to a
      // blank view.
      if (hasView(view)) {
        showView(view);
      } else {
        showComingSoon();
      }
    });
  });

  // ---- "Coming soon" popup ----
  // One small dialog, created on first use. Shown for links/cards that don't
  // have a page or feature behind them yet.
  let comingSoonOverlay = null;
  let comingSoonReturnFocus = null;

  function buildComingSoon() {
    const overlay = document.createElement("div");
    overlay.className = "coming-soon-overlay";
    overlay.innerHTML = `
      <div class="coming-soon-card" role="dialog" aria-modal="true" aria-labelledby="comingSoonTitle" aria-describedby="comingSoonText" tabindex="-1">
        <span class="coming-soon-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </span>
        <h3 id="comingSoonTitle">Coming soon</h3>
        <p id="comingSoonText">This feature is coming soon.</p>
        <button type="button" class="coming-soon-close">Got it</button>
      </div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest(".coming-soon-close")) {
        hideComingSoon();
      }
    });
    return overlay;
  }

  function showComingSoon(message) {
    if (!comingSoonOverlay) comingSoonOverlay = buildComingSoon();
    comingSoonOverlay.querySelector("#comingSoonText").textContent =
      typeof message === "string" && message ? message : "This feature is coming soon.";
    comingSoonReturnFocus = document.activeElement;
    comingSoonOverlay.classList.add("is-open");
    comingSoonOverlay.querySelector(".coming-soon-close").focus();
  }

  function hideComingSoon() {
    if (!comingSoonOverlay) return;
    comingSoonOverlay.classList.remove("is-open");
    comingSoonReturnFocus?.focus?.();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && comingSoonOverlay?.classList.contains("is-open")) {
      hideComingSoon();
    }
  });

  // Any link that is just a placeholder (href="#") with no job of its own, or
  // anything marked data-coming-soon, opens the popup instead of jumping
  // to the top of the page. Add data-coming-soon="Custom message" to change
  // the wording for one link.
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a, [data-coming-soon]");
    if (!link) return;

    const marked = link.hasAttribute("data-coming-soon");
    const href = link.getAttribute("href");
    const isPlaceholder =
      link.tagName === "A" &&
      (href === "#" || href === "") &&
      !link.hasAttribute("data-view-toggle") &&
      !link.hasAttribute("data-logout") &&
      !link.hasAttribute("data-no-coming-soon");

    if (!marked && !isPlaceholder) return;
    event.preventDefault();
    showComingSoon(link.getAttribute("data-coming-soon"));
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-scroll-target]");
    if (!trigger) return;

    const targetId = trigger.getAttribute("href");
    if (!targetId || !targetId.startsWith("#")) return;

    const target = document.querySelector(targetId);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ---- Overview performance summary + recent activity ----
  function updateOverviewSummary(source = user) {
    const earnedEl = document.querySelector("[data-earned-today]");
    const tasksEl = document.querySelector("[data-tasks-completed]");
    if (earnedEl) {
      const earned = Number(source?.earnedToday ?? 0);
      earnedEl.textContent = money(earned);
    }
    if (tasksEl) {
      const tasks = Number(source?.tasksCompleted ?? 0);
      const value = Math.min(Math.round(tasks), 60);
      tasksEl.textContent = `${value} / 60`;
    }
  }

  async function loadOverviewSummary() {
    updateOverviewSummary(user);
    try {
      const response = await fetch("/api/profile/me/account", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load account summary.");
      const data = await response.json();
      if (data) updateOverviewSummary(data);
    } catch {
      // Leave the current fallback values in place.
    }
  }

  async function loadRecentActivity() {
    const list = document.querySelector("[data-recent-activity-list]");
    if (!list) return;

    const emptyCopy = document.createElement("li");
    emptyCopy.className = "ov-activity-empty";
    emptyCopy.textContent = "No recent activity in the last 24 hours.";

    try {
      const response = await fetch("/api/profile/me/transactions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load recent activity.");

      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const recent = (data.transactions || [])
        .filter((entry) => {
          const date = new Date(entry.createdAt || entry.created_at || Date.now());
          return !Number.isNaN(date.getTime()) && date.getTime() >= cutoff;
        })
        .slice(0, 6);

      if (!recent.length) {
        list.replaceChildren(emptyCopy);
        return;
      }

      const items = recent.map((entry) => {
        const item = document.createElement("li");
        item.className = "ov-activity-item";

        const type = String(entry.type || "Transaction");
        const amount = Number(entry.total ?? entry.amount ?? 0);
        const direction = /credit/i.test(type) ? "credit" : "debit";
        const label = /credit/i.test(type) ? "Credit" : /debit/i.test(type) ? "Debit" : "Transaction";

        const badge = document.createElement("span");
        badge.className = `ov-activity-pill ov-activity-pill--${direction}`;
        badge.textContent = label;

        const details = document.createElement("div");
        details.className = "ov-activity-details";

        const title = document.createElement("strong");
        title.textContent = `${entry.assetName || "Account"}${entry.assetSymbol ? ` (${entry.assetSymbol})` : ""}`.trim();

        const time = document.createElement("small");
        const createdAt = new Date(entry.createdAt || entry.created_at || Date.now());
        time.textContent = Number.isNaN(createdAt.getTime())
          ? "Just now"
          : createdAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

        details.append(title, time);

        const value = document.createElement("span");
        value.className = "ov-activity-value";
        const sign = direction === "credit" ? "+" : "-";
        value.textContent = `${sign}${formatCurrency(Math.abs(amount), entry.currency || "USD")}`;

        item.append(badge, details, value);
        return item;
      });

      list.replaceChildren(...items);
    } catch {
      list.replaceChildren(emptyCopy);
    }
  }

  loadOverviewSummary();
  loadRecentActivity();

  // ---- Sidebar expand/collapse toggle ----
  // On desktop this pins the rail open wider; on narrow screens (see
  // profile.css) the same "is-expanded" class instead slides the sidebar
  // in as an off-canvas drawer over a backdrop, so the two behaviors share
  // one piece of state.
  const sideNav = document.querySelector("[data-side-nav]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navBackdrop = document.querySelector("[data-nav-backdrop]");
  const isMobileNav = () => window.matchMedia("(max-width: 860px)").matches;

  function setNavExpanded(expanded) {
    sideNav.classList.toggle("is-expanded", expanded);
    navToggle?.setAttribute("aria-expanded", String(expanded));
    navBackdrop?.classList.toggle("is-visible", expanded && isMobileNav());
    document.body.classList.toggle("nav-open", expanded && isMobileNav());
  }

  navToggle?.addEventListener("click", () => {
    setNavExpanded(!sideNav.classList.contains("is-expanded"));
  });

  navBackdrop?.addEventListener("click", () => setNavExpanded(false));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sideNav.classList.contains("is-expanded")) {
      setNavExpanded(false);
    }
  });

  // Picking a destination on mobile should close the drawer behind it.
  sideNav.querySelectorAll(".side-nav-icon").forEach((link) => {
    link.addEventListener("click", () => {
      if (isMobileNav()) setNavExpanded(false);
    });
  });

  // ---- Log out: clear the mock session and return to login ----
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("userRole");
      localStorage.removeItem("kbiUser");
      fetch("/api/logout", { method: "POST" }).finally(() => window.location.replace("login.html"));
    });
  });

  // ---- Live crypto cards, continuous marquee: cards drift in from the
  // right and out to the left on an endless loop (CSS animation on the
  // track); the coin list is rendered twice back-to-back so the loop is
  // seamless, and every symbol's price/% ticks up or down every couple
  // of seconds. ----
  const cryptoTrack = document.querySelector("[data-crypto-track]");
  if (cryptoTrack) {
    const COINS = [
      { symbol: "BTC", id: "bitcoin", name: "Bitcoin", badge: "₿", color: "#f7931a", price: 109240, change: 1.6, dp: 0 },
      { symbol: "ETH", id: "ethereum", name: "Ethereum", badge: "Ξ", color: "#627eea", price: 4015, change: 2.9, dp: 0 },
      { symbol: "SOL", id: "solana", name: "Solana", badge: "◎", color: "#9945ff", price: 198.4, change: -0.8, dp: 2 },
      { symbol: "XRP", id: "ripple", name: "Ripple", badge: "X", color: "#111111", price: 2.34, change: 3.1, dp: 3 },
      { symbol: "BNB", id: "binancecoin", name: "BNB", badge: "BN", color: "#f0b90b", price: 712.5, change: 0.7, dp: 2 },
      { symbol: "DOGE", id: "dogecoin", name: "Dogecoin", badge: "DG", color: "#c2a633", price: 0.182, change: 4.2, dp: 4 },
      { symbol: "ADA", id: "cardano", name: "Cardano", badge: "AD", color: "#0033ad", price: 0.61, change: -1.1, dp: 3 },
      { symbol: "AVAX", id: "avalanche-2", name: "Avalanche", badge: "AV", color: "#e84142", price: 31.85, change: 2.0, dp: 2 },
      { symbol: "LINK", id: "chainlink", name: "Chainlink", badge: "LK", color: "#2a5ada", price: 18.42, change: 1.3, dp: 2 },
      { symbol: "TRX", id: "tron", name: "TRON", badge: "TX", color: "#ff0013", price: 0.158, change: 0.4, dp: 4 },
      { symbol: "DOT", id: "polkadot", name: "Polkadot", badge: "DT", color: "#e6007a", price: 5.62, change: -0.3, dp: 2 },
      { symbol: "TON", id: "the-open-network", name: "Toncoin", badge: "TN", color: "#0098ea", price: 3.41, change: 5.6, dp: 2 },
      { symbol: "LTC", id: "litecoin", name: "Litecoin", badge: "LC", color: "#345d9d", price: 96.3, change: 0.9, dp: 2 },
      { symbol: "SHIB", id: "shiba-inu", name: "Shiba Inu", badge: "SH", color: "#ff6d00", price: 0.0000142, change: 2.7, dp: 8 },
      { symbol: "SUI", id: "sui", name: "Sui", badge: "SU", color: "#4da2ff", price: 2.86, change: 6.3, dp: 3 },
    ];

    function formatPrice(coin) {
      return "$" + coin.price.toLocaleString(undefined, { minimumFractionDigits: coin.dp, maximumFractionDigits: coin.dp });
    }

    function formatChange(change) {
      const sign = change >= 0 ? "+" : "−";
      return sign + Math.abs(change).toFixed(1) + "%";
    }

    function cardHTML(coin) {
      const isUp = coin.change >= 0;
      return `
        <a class="ov-crypto-card" href="https://www.kucoin.com" target="_blank" rel="noopener noreferrer" data-symbol="${coin.symbol}">
          <div class="ov-crypto-head">
            <span class="ov-crypto-badge" style="background:${coin.color};">${coin.badge}</span>
            <span class="ov-crypto-name">
              <strong>${coin.symbol}</strong>
              <small>${coin.name}</small>
            </span>
            <span class="ov-crypto-change ${isUp ? "is-up" : "is-down"}" data-change>${formatChange(coin.change)}</span>
          </div>
          <div class="ov-crypto-price" data-price>${formatPrice(coin)}</div>
        </a>`;
    }

    // Render the coin list twice, back to back, so the wrap-around reset
    // (after shifting through one full set) lands on an identical set of
    // cards and is invisible to the eye.
    cryptoTrack.innerHTML = COINS.map(cardHTML).join("") + COINS.map(cardHTML).join("");

    // ---- Step carousel: hold still for 6s, then slide left by exactly one
    // card's width so a new card enters from the right and the leftmost
    // card exits on the left. Repeats forever. ----
    let step = 0;
    let shiftCount = 0;

    function measureStep() {
      const list = cryptoTrack.querySelectorAll(".ov-crypto-card");
      if (list.length > 1) step = list[1].offsetLeft - list[0].offsetLeft;
    }

    function advanceStep() {
      shiftCount++;
      cryptoTrack.style.transition = "transform 0.6s ease";
      cryptoTrack.style.transform = `translateX(-${step * shiftCount}px)`;

      // Once we've shifted through a full original set, the duplicated
      // second set is now sitting exactly where the first set started —
      // snap back to 0 with no transition so the loop never visibly resets.
      if (shiftCount >= COINS.length) {
        setTimeout(() => {
          cryptoTrack.style.transition = "none";
          cryptoTrack.style.transform = "translateX(0px)";
          void cryptoTrack.offsetWidth; // force reflow so the next transition re-applies cleanly
          shiftCount = 0;
        }, 650);
      }
    }

    measureStep();
    setInterval(advanceStep, 6000);

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cryptoTrack.style.transition = "none";
        cryptoTrack.style.transform = "translateX(0px)";
        void cryptoTrack.offsetWidth;
        shiftCount = 0;
        measureStep();
      }, 150);
    });

    // Update every element for this symbol anywhere on the page — the
    // marquee cards and the "Crypto & Markets" grid both use the same
    // [data-symbol]/[data-price]/[data-change] hooks.
    function paintCoin(coin) {
      const isUp = coin.change >= 0;
      document.querySelectorAll(`[data-symbol="${coin.symbol}"]`).forEach((el) => {
        const priceEl = el.querySelector("[data-price]");
        const changeEl = el.querySelector("[data-change]");
        if (priceEl) {
          priceEl.textContent = formatPrice(coin);
          priceEl.classList.add("is-flash");
          setTimeout(() => priceEl.classList.remove("is-flash"), 300);
        }
        if (changeEl) {
          changeEl.textContent = formatChange(coin.change);
          changeEl.classList.toggle("is-up", isUp);
          changeEl.classList.toggle("is-down", !isUp);
        }
      });
    }

    // ---- Real crypto prices from CoinGecko's free public API (no key
    // needed, CORS-friendly, safe to call straight from the browser). ----
    async function fetchLiveCryptoPrices() {
      const ids = COINS.map((c) => c.id).join(",");
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
        const data = await res.json();

        COINS.forEach((coin) => {
          const entry = data[coin.id];
          if (!entry || typeof entry.usd !== "number") return;
          coin.price = entry.usd;
          if (typeof entry.usd_24h_change === "number") coin.change = entry.usd_24h_change;
          paintCoin(coin);
        });
      } catch (err) {
        // Keep showing the last known prices rather than breaking the UI.
        console.warn("Live crypto price fetch failed, keeping last known values:", err);
      }
    }

    fetchLiveCryptoPrices();
    setInterval(fetchLiveCryptoPrices, 45000);
  }

  // ---- Real US stock quotes, proxied through our own backend so the
  // market-data API key never reaches the browser. Covers NVDA, AAPL,
  // MSFT and TSLA for now — Twelve Data's free tier only includes
  // real-time data for US exchanges; the other exchange lists on this
  // page stay as demo data until that's upgraded (or another provider is
  // added for them). ----
  const STOCK_SYMBOLS = ["NVDA", "AAPL", "MSFT", "TSLA"];

  if (document.querySelector('[data-symbol="NVDA"]')) {
    function formatStockPrice(price) {
      return "$" + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatStockChange(change) {
      const sign = change >= 0 ? "+" : "−";
      return sign + Math.abs(change).toFixed(2) + "%";
    }

    function paintStock(symbol, price, changePercent) {
      const isUp = changePercent >= 0;
      document.querySelectorAll(`[data-symbol="${symbol}"]`).forEach((el) => {
        const priceEl = el.querySelector("[data-price]");
        const changeEl = el.querySelector("[data-change]");
        if (priceEl) {
          priceEl.textContent = formatStockPrice(price);
          priceEl.classList.add("is-flash");
          setTimeout(() => priceEl.classList.remove("is-flash"), 300);
        }
        if (changeEl) {
          changeEl.textContent = formatStockChange(changePercent);
          changeEl.classList.toggle("is-up", isUp);
          changeEl.classList.toggle("is-down", !isUp);
        }
      });
    }

    async function fetchLiveStockQuotes() {
      try {
        const res = await fetch(`/api/quotes/stocks?symbols=${STOCK_SYMBOLS.join(",")}`);
        if (!res.ok) throw new Error(`Quotes endpoint responded ${res.status}`);
        const quotes = await res.json();

        STOCK_SYMBOLS.forEach((symbol) => {
          const q = quotes[symbol];
          if (q && typeof q.price === "number") {
            paintStock(symbol, q.price, q.changePercent ?? 0);
          }
        });
      } catch (err) {
        // Backend not reachable yet, or the quotes route isn't wired up —
        // leave the placeholder numbers in place rather than breaking the UI.
        console.warn("Live stock quote fetch failed, keeping last known values:", err);
      }
    }

    fetchLiveStockQuotes();
    setInterval(fetchLiveStockQuotes, 60000);
  }

  const assetCatalog = {
    stocks: [
      { symbol: "NVDA", name: "NVIDIA Corporation", country: "United States", price: 228.38, currency: "USD", url: "https://www.interactivebrokers.com" },
      { symbol: "AAPL", name: "Apple Inc.", country: "United States", price: 256.8, currency: "USD", url: "https://www.interactivebrokers.com" },
      { symbol: "MSFT", name: "Microsoft Corporation", country: "United States", price: 512.3, currency: "USD", url: "https://www.interactivebrokers.com" },
      { symbol: "TSLA", name: "Tesla, Inc.", country: "United States", price: 431.9, currency: "USD", url: "https://www.interactivebrokers.com" },
      { symbol: "SHEL", name: "Shell plc", country: "United Kingdom", price: 26.4, currency: "GBP", url: "https://www.interactivebrokers.com" },
      { symbol: "AZN", name: "AstraZeneca", country: "United Kingdom", price: 118.2, currency: "GBP", url: "https://www.interactivebrokers.com" },
      { symbol: "HSBA", name: "HSBC Holdings", country: "United Kingdom", price: 7.85, currency: "GBP", url: "https://www.interactivebrokers.com" },
      { symbol: "BP", name: "BP plc", country: "United Kingdom", price: 4.62, currency: "GBP", url: "https://www.interactivebrokers.com" },
      { symbol: "SAP", name: "SAP SE", country: "Germany", price: 248.6, currency: "EUR", url: "https://www.interactivebrokers.com" },
      { symbol: "SIE", name: "Siemens AG", country: "Germany", price: 198.4, currency: "EUR", url: "https://www.interactivebrokers.com" },
      { symbol: "VOW3", name: "Volkswagen AG", country: "Germany", price: 112.75, currency: "EUR", url: "https://www.interactivebrokers.com" },
      { symbol: "ALV", name: "Allianz SE", country: "Germany", price: 321.9, currency: "EUR", url: "https://www.interactivebrokers.com" },
      { symbol: "7203", name: "Toyota Motor", country: "Japan", price: 2845, currency: "JPY", url: "https://www.interactivebrokers.com" },
      { symbol: "6758", name: "Sony Group", country: "Japan", price: 3210, currency: "JPY", url: "https://www.interactivebrokers.com" },
      { symbol: "7974", name: "Nintendo", country: "Japan", price: 9680, currency: "JPY", url: "https://www.interactivebrokers.com" },
      { symbol: "9984", name: "SoftBank Group", country: "Japan", price: 8420, currency: "JPY", url: "https://www.interactivebrokers.com" },
      { symbol: "RELIANCE", name: "Reliance Industries", country: "India", price: 2940.5, currency: "INR", url: "https://www.interactivebrokers.com" },
      { symbol: "TCS", name: "Tata Consultancy Services", country: "India", price: 4120.75, currency: "INR", url: "https://www.interactivebrokers.com" },
      { symbol: "HDFCBANK", name: "HDFC Bank", country: "India", price: 1685.2, currency: "INR", url: "https://www.interactivebrokers.com" },
      { symbol: "INFY", name: "Infosys", country: "India", price: 1842.6, currency: "INR", url: "https://www.interactivebrokers.com" },
      { symbol: "NPN", name: "Naspers", country: "South Africa", price: 3845, currency: "ZAR", url: "https://www.interactivebrokers.com" },
      { symbol: "MTN", name: "MTN Group", country: "South Africa", price: 118.4, currency: "ZAR", url: "https://www.interactivebrokers.com" },
      { symbol: "SBK", name: "Standard Bank", country: "South Africa", price: 215.6, currency: "ZAR", url: "https://www.interactivebrokers.com" },
      { symbol: "VOD", name: "Vodacom Group", country: "South Africa", price: 132.9, currency: "ZAR", url: "https://www.interactivebrokers.com" },
      { symbol: "PETR4", name: "Petrobras", country: "Brazil", price: 38.2, currency: "BRL", url: "https://www.interactivebrokers.com" },
      { symbol: "VALE3", name: "Vale S.A.", country: "Brazil", price: 68.45, currency: "BRL", url: "https://www.interactivebrokers.com" },
      { symbol: "ITUB4", name: "Itaú Unibanco", country: "Brazil", price: 34.9, currency: "BRL", url: "https://www.interactivebrokers.com" },
      { symbol: "ABEV3", name: "Ambev", country: "Brazil", price: 13.85, currency: "BRL", url: "https://www.interactivebrokers.com" },
      { symbol: "SHOP", name: "Shopify Inc.", country: "Canada", price: 118.4, currency: "CAD", url: "https://www.interactivebrokers.com" },
      { symbol: "RY", name: "Royal Bank of Canada", country: "Canada", price: 168.2, currency: "CAD", url: "https://www.interactivebrokers.com" },
      { symbol: "ENB", name: "Enbridge Inc.", country: "Canada", price: 58.9, currency: "CAD", url: "https://www.interactivebrokers.com" },
      { symbol: "CNR", name: "Canadian National Railway", country: "Canada", price: 148.75, currency: "CAD", url: "https://www.interactivebrokers.com" }
    ],
    crypto: [
      { symbol: "BTC", name: "Bitcoin", price: 109240, currency: "USD", url: "https://www.kucoin.com" },
      { symbol: "ETH", name: "Ethereum", price: 4015, currency: "USD", url: "https://www.kucoin.com" },
      { symbol: "SOL", name: "Solana", price: 198.4, currency: "USD", url: "https://www.kucoin.com" },
      { symbol: "XRP", name: "Ripple", price: 2.34, currency: "USD", url: "https://www.kucoin.com" },
      { symbol: "BNB", name: "BNB", price: 712.5, currency: "USD", url: "https://www.kucoin.com" },
      { symbol: "DOGE", name: "Dogecoin", price: 0.182, currency: "USD", url: "https://www.kucoin.com" },
      { symbol: "ADA", name: "Cardano", price: 0.61, currency: "USD", url: "https://www.kucoin.com" },
      { symbol: "AVAX", name: "Avalanche", price: 31.85, currency: "USD", url: "https://www.kucoin.com" },
      { symbol: "LINK", name: "Chainlink", price: 18.42, currency: "USD", url: "https://www.kucoin.com" },
      { symbol: "TRX", name: "TRON", price: 0.158, currency: "USD", url: "https://www.kucoin.com" }
    ],
    metals: [
      { symbol: "XAU", name: "Gold", price: 3412.5, currency: "USD", url: "https://www.kitco.com" },
      { symbol: "XAG", name: "Silver", price: 39.86, currency: "USD", url: "https://www.kitco.com" },
      { symbol: "XPT", name: "Platinum", price: 1468.2, currency: "USD", url: "https://www.kitco.com" },
      { symbol: "XPD", name: "Palladium", price: 1092.75, currency: "USD", url: "https://www.kitco.com" }
    ]
  };

  function formatCurrency(value, currency = "USD") {
    const amount = Number(value || 0);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "JPY" ? 0 : 2,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  }

  function findAsset(type, symbol, fallbackLabel) {
    const source = assetCatalog[type] || [];
    const resolvedSymbol = (symbol || fallbackLabel || "").trim();
    return source.find((item) => item.symbol === resolvedSymbol || item.name === resolvedSymbol) || source[0];
  }

  function getAssetType(card) {
    const title = (card.querySelector("strong")?.textContent || card.textContent || "").trim();
    const symbol = (card.dataset.symbol || "").trim();

    if (card.closest("[data-view='metals']") || title === "Gold" || title === "Silver" || title === "Platinum" || title === "Palladium") {
      return { type: "metals", asset: findAsset("metals", symbol, title) };
    }

    if (card.closest("[data-view='crypto']") || card.closest("[data-crypto-ticker]") || /^(BTC|ETH|SOL|XRP|BNB|DOGE|ADA|AVAX|LINK|TRX)$/.test(symbol)) {
      return { type: "crypto", asset: findAsset("crypto", symbol, title) };
    }

    return { type: "stocks", asset: findAsset("stocks", symbol, title) };
  }

  function assetActionPanel(card) {
    let panel = card.querySelector(".asset-action-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "asset-action-panel";
      panel.innerHTML = `
        <button type="button" class="asset-action-btn asset-action-btn--buy" data-action="buy">Buy $</button>
        <button type="button" class="asset-action-btn asset-action-btn--explore" data-action="explore">Explore</button>
      `;
      card.appendChild(panel);
    }
    return panel;
  }

  function setCardExpanded(card, expanded) {
    const panel = assetActionPanel(card);
    card.classList.toggle("asset-card--expanded", expanded);
    panel.hidden = !expanded;
    if (!expanded) panel.setAttribute("aria-hidden", "true");
    else panel.removeAttribute("aria-hidden");
  }

  function bindAssetCard(card) {
    const panel = assetActionPanel(card);
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");

    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      event.preventDefault();
      const expanded = !card.classList.contains("asset-card--expanded");
      document.querySelectorAll(".ov-mover-card, .ov-crypto-card").forEach((other) => {
        if (other !== card) setCardExpanded(other, false);
      });
      setCardExpanded(card, expanded);
    });

    panel.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const { type, asset } = getAssetType(card);
        const action = button.dataset.action;

        if (action === "explore") {
          window.open(asset.url || "https://www.interactivebrokers.com", "_blank", "noopener,noreferrer");
          return;
        }

        openAssetPurchase(type, asset);
      });
    });
  }

  // ---- Payment details (shown after the person presses Pay) ----
  // EDIT THIS: one entry per network you accept. For each, open Binance >
  // Wallet > Deposit > Crypto, pick the coin and that network, and paste the
  // address Binance shows. Every network has its own address, and sending on
  // the wrong network can lose the money permanently.
  // Crypto purchases let the person choose from this list; stocks and metals
  // use the first entry that has a real address.
  const PAYMENT_OPTIONS = [
    { network: "TRC20 (Tron)", asset: "USDT", address: "REPLACE_WITH_YOUR_TRC20_ADDRESS" },
    { network: "BEP20 (BNB Smart Chain)", asset: "USDT", address: "REPLACE_WITH_YOUR_BEP20_ADDRESS" },
    { network: "ERC20 (Ethereum)", asset: "USDT", address: "REPLACE_WITH_YOUR_ERC20_ADDRESS" },
  ];

  function paymentIsConfigured(option) {
    const address = String(option?.address || "").trim();
    return address.length >= 10 && !/REPLACE/i.test(address);
  }

  function defaultPaymentOption() {
    return PAYMENT_OPTIONS.find(paymentIsConfigured) || PAYMENT_OPTIONS[0];
  }

  function showPaymentDetails(purchase, totalText, option, onCompleted) {
    let overlay = document.querySelector(".asset-payment-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "asset-payment-overlay";
      overlay.innerHTML = `
        <section class="asset-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="asset-payment-title">
          <button type="button" class="asset-payment-close" aria-label="Close payment window">×</button>
          <h2 id="asset-payment-title">Send your payment</h2>
          <p class="asset-payment-summary"></p>

          <div class="asset-payment-body">
            <div class="asset-payment-meta">
              <div><span>Coin</span><strong class="asset-payment-asset"></strong></div>
              <div><span>Network</span><strong class="asset-payment-network"></strong></div>
            </div>

            <label class="asset-payment-label" for="asset-payment-address">Binance deposit address</label>
            <div class="asset-payment-address-row">
            
              <input id="asset-payment-address" class="asset-payment-address" type="text" readonly spellcheck="false" autocomplete="off" />
              <button type="button" class="asset-payment-copy">Copy</button>
            </div>

            <p class="asset-payment-warning">
              Send only <strong class="asset-payment-asset-inline"></strong> on the
              <strong class="asset-payment-network-inline"></strong> network. Other coins or networks
              cannot be recovered. After pasting, check the first and last characters of the address.
              Press Completed only after you have sent the transfer.
            </p>
          </div>

          <p class="asset-payment-unavailable" hidden>Payment details aren't available right now. To proceed, message us on Telegram.</p>
          <a class="asset-payment-telegram" href="https://t.me/+12512098369" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            <span>To proceed with your payment, message us on Telegram</span>
          </a>
          <p class="asset-payment-error" role="alert" hidden></p>

          <button type="button" class="asset-payment-done">Completed</button>
          <button type="button" class="asset-payment-cancel">Cancel</button>
        </section>
      `;
      document.body.appendChild(overlay);
    }

    const closeButton = overlay.querySelector(".asset-payment-close");
    const cancelButton = overlay.querySelector(".asset-payment-cancel");
    const doneButton = overlay.querySelector(".asset-payment-done");
    const copyButton = overlay.querySelector(".asset-payment-copy");
    const addressInput = overlay.querySelector(".asset-payment-address");
    const errorLine = overlay.querySelector(".asset-payment-error");
    const configured = paymentIsConfigured(option);

    overlay.querySelector(".asset-payment-summary").textContent =
      `${purchase.assetName} (${purchase.assetSymbol}) × ${purchase.quantity} — total ${totalText}. Send the equivalent value in ${option.asset}.`;
    overlay.querySelector(".asset-payment-asset").textContent = option.asset;
    overlay.querySelector(".asset-payment-network").textContent = option.network;
    overlay.querySelector(".asset-payment-asset-inline").textContent = option.asset;
    overlay.querySelector(".asset-payment-network-inline").textContent = option.network;
    addressInput.value = configured ? option.address.trim() : "";

    overlay.querySelector(".asset-payment-body").hidden = !configured;
    overlay.querySelector(".asset-payment-unavailable").hidden = configured;
    doneButton.hidden = !configured;
    errorLine.hidden = true;
    errorLine.textContent = "";
    doneButton.disabled = false;
    doneButton.textContent = "Completed";
    copyButton.textContent = "Copy";

    function close() {
      overlay.classList.remove("is-open");
      document.removeEventListener("keydown", onKeydown);
    }

    function onKeydown(event) {
      if (event.key === "Escape") close();
    }

    async function copyAddress() {
      const text = addressInput.value;
      let copied = false;
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        // Fallback for browsers/pages where the Clipboard API isn't allowed
        addressInput.focus();
        addressInput.select();
        addressInput.setSelectionRange(0, text.length);
        try {
          copied = document.execCommand("copy");
        } catch {
          copied = false;
        }
      }
      copyButton.textContent = copied ? "Copied ✓" : "Press Ctrl+C";
      copyButton.classList.toggle("is-copied", copied);
      clearTimeout(copyButton._resetTimer);
      copyButton._resetTimer = setTimeout(() => {
        copyButton.textContent = "Copy";
        copyButton.classList.remove("is-copied");
      }, 2200);
    }

    // onclick (not addEventListener) so re-opening the popup never stacks handlers
    closeButton.onclick = close;
    cancelButton.onclick = close;
    copyButton.onclick = copyAddress;
    overlay.onclick = (event) => {
      if (event.target === overlay) close();
    };
    doneButton.onclick = async () => {
      doneButton.disabled = true;
      doneButton.textContent = "Recording...";
      errorLine.hidden = true;
      try {
        await onCompleted();
        close();
      } catch (error) {
        errorLine.textContent = error.message || "Could not record this purchase. Please try again.";
        errorLine.hidden = false;
        doneButton.disabled = false;
        doneButton.textContent = "Completed";
      }
    };

    document.addEventListener("keydown", onKeydown);
    overlay.classList.add("is-open");
    (configured ? copyButton : closeButton).focus();
  }

  function showPaymentProcessing() {
    let overlay = document.querySelector(".asset-processing-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "asset-processing-overlay";
      overlay.innerHTML = `
        <section class="asset-processing-dialog" role="dialog" aria-modal="true" aria-labelledby="asset-processing-title">
          <svg class="asset-hourglass-icon" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M12 5h24M12 43h24M15 6c0 9 3.8 12.2 9 18-5.2 5.8-9 9-9 18M33 6c0 9-3.8 12.2-9 18 5.2 5.8 9 9 9 18"></path>
            <path class="asset-hourglass-sand" d="M20 13h8l-4 6-4-6ZM20 35h8l-4-6-4 6Z"></path>
          </svg>
          <h2 id="asset-processing-title">Purchase pending</h2>
          <p>Thanks, we've recorded that you completed your transfer. Your purchase stays pending until the payment is verified. You can follow it in Settings, under Purchase history.</p>
          <button type="button" class="asset-processing-close">Close</button>
        </section>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector(".asset-processing-close").addEventListener("click", () => {
        overlay.classList.remove("is-open");
      });
    }

    overlay.classList.add("is-open");
    overlay.querySelector(".asset-processing-close").focus();
  }

  function openAssetPurchase(type, asset) {
    const backdrop = document.querySelector(".asset-buy-backdrop") || createAssetPurchaseModal();
    const panel = backdrop.querySelector(".asset-buy-panel");
    const typeButtons = [...backdrop.querySelectorAll(".asset-buy-kind")];
    const typeGrid = backdrop.querySelector(".asset-buy-kind-grid");
    const form = backdrop.querySelector(".asset-buy-form");
    const countrySelect = backdrop.querySelector("#asset-buy-country");
    const itemSearch = backdrop.querySelector("#asset-buy-search");
    const quantityInput = backdrop.querySelector("#asset-buy-quantity");
    const totalLabel = backdrop.querySelector("#asset-buy-total");

    const networkField = backdrop.querySelector(".asset-buy-network-field");

    function syncType(newType) {
      networkField.hidden = newType !== "crypto";
      typeButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.type === newType));
      const catalog = assetCatalog[newType] || [];
      const options = catalog.map((item) => `<option value="${item.symbol}">${item.name}</option>`).join("");
      itemSearch.setAttribute("list", `asset-search-list-${newType}`);
      const datalist = backdrop.querySelector(`#asset-search-list-${newType}`) || document.createElement("datalist");
      datalist.id = `asset-search-list-${newType}`;
      datalist.innerHTML = options;
      if (!backdrop.querySelector(`#asset-search-list-${newType}`)) {
        form.appendChild(datalist);
      }

      const selected = catalog.find((item) => item.symbol === (asset?.symbol || catalog[0].symbol)) || catalog[0];
      itemSearch.value = selected.symbol;
      quantityInput.value = 10;
      quantityInput.min = 10;
      quantityInput.max = 5000;
      updateTotal();
    }

    function updateTotal() {
      const chosenType = backdrop.dataset.currentType || type;
      const options = assetCatalog[chosenType] || [];
      const selected = options.find((item) => item.symbol === itemSearch.value) || options[0] || { price: 0, currency: "USD" };
      const quantity = Math.max(10, Number(quantityInput.value || 10));
      const total = Number(selected.price || 0) * quantity;
      totalLabel.textContent = formatCurrency(total, selected.currency || "USD");
    }

    backdrop.dataset.currentType = type;
    typeGrid.hidden = false;
    form.hidden = false;
    syncType(type);

    typeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        backdrop.dataset.currentType = button.dataset.type;
        syncType(button.dataset.type);
      }, { once: true });
    });

    itemSearch.oninput = () => updateTotal();
    quantityInput.oninput = () => updateTotal();

    form.onsubmit = (event) => {
      event.preventDefault();
      const chosenType = backdrop.dataset.currentType || type;
      const catalog = assetCatalog[chosenType] || [];
      const selected = catalog.find((item) => item.symbol === itemSearch.value) || catalog[0];
      if (!selected) return;

      const purchase = {
        type: chosenType,
        assetName: selected.name,
        assetSymbol: selected.symbol,
        currency: selected.currency,
        quantity: Math.max(10, Number(quantityInput.value || 10)),
        unitPrice: Number(selected.price),
      };
      const totalText = totalLabel.textContent;

      // Crypto: the person picks the network. Stocks and metals: default one.
      const networkSelect = backdrop.querySelector("#asset-buy-network");
      const paymentOption = chosenType === "crypto"
        ? PAYMENT_OPTIONS[Number(networkSelect.value)] || defaultPaymentOption()
        : defaultPaymentOption();
      purchase.network = paymentOption.network;

      // Step 1: close the buy form and show where to send the payment.
      backdrop.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");

      // Step 2: only when the person presses "Completed" is the request
      // recorded, and only then does the pending message appear.
      showPaymentDetails(purchase, totalText, paymentOption, async () => {
        const response = await fetch("/api/profile/me/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(purchase),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not record this purchase.");

        showPaymentProcessing();
        loadTransactionHistory();
      });
    };

    backdrop.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    backdrop.querySelector(".asset-buy-close").onclick = () => backdrop.classList.remove("is-open");
  }

  function createAssetPurchaseModal() {
    const backdrop = document.createElement("div");
    backdrop.className = "asset-buy-backdrop";
    backdrop.innerHTML = `
      <div class="asset-buy-panel" role="dialog" aria-modal="true" aria-labelledby="asset-buy-title" aria-hidden="true">
        <button type="button" class="asset-buy-close" aria-label="Close buy panel">×</button>
        <div class="asset-buy-header">
          <h3 id="asset-buy-title">Buy investment</h3>
          <p>Select your asset type and complete the checkout details.</p>
        </div>

        <div class="asset-buy-kind-grid">
          <button type="button" class="asset-buy-kind is-active" data-type="stocks">Stocks</button>
          <button type="button" class="asset-buy-kind" data-type="crypto">Crypto</button>
          <button type="button" class="asset-buy-kind" data-type="metals">Metals</button>
        </div>

        <form class="asset-buy-form">
          <div class="asset-buy-form-grid">
            <div class="asset-form-field">
              <label for="asset-buy-country">Country</label>
              <select id="asset-buy-country">
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Germany">Germany</option>
                <option value="Japan">Japan</option>
                <option value="India">India</option>
                <option value="South Africa">South Africa</option>
                <option value="Brazil">Brazil</option>
                <option value="Canada">Canada</option>
                <option value="Nigeria">Nigeria</option>
              </select>
            </div>

            <div class="asset-form-field">
              <label for="asset-buy-search">Search</label>
              <input id="asset-buy-search" type="text" list="asset-search-list-stocks" placeholder="Search asset" />
            </div>
          </div>

          <div class="asset-buy-form-grid">
            <div class="asset-form-field">
              <label for="asset-buy-quantity">Quantity</label>
              <input id="asset-buy-quantity" type="number" min="10" step="1" value="10" />
            </div>

            <div class="asset-form-field">
              <span>Amount to pay</span>
              <div class="asset-total">
                <strong id="asset-buy-total">$0.00</strong>
              </div>
            </div>
          </div>

          <div class="asset-form-field asset-buy-network-field" hidden>
            <label for="asset-buy-network">Network</label>
            <select id="asset-buy-network"></select>
          </div>

          <button type="submit" class="asset-buy-submit">Pay</button>
        </form>

      </div>
    `;
    document.body.appendChild(backdrop);
    const networkSelect = backdrop.querySelector("#asset-buy-network");
    PAYMENT_OPTIONS.forEach((option, index) => {
      const item = document.createElement("option");
      item.value = String(index);
      item.textContent = `${option.network} · ${option.asset}`;
      networkSelect.appendChild(item);
    });
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) backdrop.classList.remove("is-open");
    });
    return backdrop;
  }

  document.querySelectorAll(".ov-mover-card, .ov-crypto-card").forEach(bindAssetCard);

  // ---- Support chat: floating AI assistant, bottom-right ----
  // Messages go to /api/support-chat on your server, which talks to the AI.
  // The AI key never reaches the browser.
  (function initSupportChat() {
    const history = []; // only real messages (the welcome text isn't sent)
    let waiting = false;

    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "support-chat-fab";
    fab.setAttribute("aria-label", "Open support chat");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-controls", "support-chat-panel");
    fab.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16h-.0A2.5 2.5 0 0 1 4 13.5v-8Z"/></svg>
    `;

    const panel = document.createElement("section");
    panel.className = "support-chat-panel";
    panel.id = "support-chat-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Support chat");
    panel.hidden = true;
    panel.innerHTML = `
      <header class="support-chat-header">
        <div>
          <strong>Support</strong>
          <span>AI assistant · replies any time</span>
        </div>
        <button type="button" class="support-chat-close" aria-label="Close support chat">×</button>
      </header>
      <div class="support-chat-log" role="log" aria-live="polite"></div>
      <p class="support-chat-note">AI assistant, not a person. It can't verify payments or give investment advice. Never share passwords or recovery phrases.</p>
      <form class="support-chat-form">
        <textarea class="support-chat-input" rows="1" maxlength="800" placeholder="Type your question..." aria-label="Your message"></textarea>
        <button type="submit" class="support-chat-send" aria-label="Send message">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12 20 4l-4 16-4.5-6L4 12Z"/></svg>
        </button>
      </form>
    `;

    document.body.append(panel, fab);

    const log = panel.querySelector(".support-chat-log");
    const form = panel.querySelector(".support-chat-form");
    const input = panel.querySelector(".support-chat-input");
    const sendButton = panel.querySelector(".support-chat-send");

    function addMessage(role, text) {
      const bubble = document.createElement("div");
      bubble.className = `support-chat-msg support-chat-msg--${role}`;
      if (role === "assistant") {
        const telegramPattern = /(Telegram)(?:[\s,:]+(?:at\s+)?https?:\/\/t\.me\/\+12512098369)?/gi;
        let lastIndex = 0;
        for (const match of text.matchAll(telegramPattern)) {
          bubble.append(document.createTextNode(text.slice(lastIndex, match.index)));
          const link = document.createElement("a");
          link.className = "support-chat-telegram-link";
          link.href = "https://t.me/+12512098369";
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = match[1];
          bubble.append(link);
          lastIndex = match.index + match[0].length;
        }
        bubble.append(document.createTextNode(text.slice(lastIndex)));
      } else {
        bubble.textContent = text;
      }
      log.appendChild(bubble);
      log.scrollTop = log.scrollHeight;
      return bubble;
    }

    function setOpen(open) {
      panel.hidden = !open;
      fab.setAttribute("aria-expanded", String(open));
      fab.setAttribute("aria-label", open ? "Close support chat" : "Open support chat");
      fab.classList.toggle("is-open", open);
      if (open) input.focus();
    }

    function autosize() {
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 110)}px`;
    }

    addMessage(
      "assistant",
      "Hi! I'm the Marsvest AI assistant. I can help you find your way around the dashboard, explain how buying and the payment steps work, and answer general questions. What do you need?"
    );

    fab.addEventListener("click", () => setOpen(panel.hidden));
    panel.querySelector(".support-chat-close").addEventListener("click", () => {
      setOpen(false);
      fab.focus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });

    input.addEventListener("input", autosize);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text || waiting) return;

      waiting = true;
      sendButton.disabled = true;
      input.value = "";
      autosize();
      addMessage("user", text);
      history.push({ role: "user", content: text });

      const typing = addMessage("assistant", "Typing...");
      typing.classList.add("is-typing");

      try {
        const response = await fetch("/api/support-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-10) }),
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) {
          throw new Error("Your session has expired. Please sign in again to use support chat.");
        }
        if (!response.ok || !data.reply) {
          throw new Error(data.error || "Sorry, I couldn't reach support right now. Please try again in a moment.");
        }
        typing.remove();
        addMessage("assistant", data.reply);
        history.push({ role: "assistant", content: data.reply });
      } catch (error) {
        typing.remove();
        // The failed question is dropped from history so the next try starts clean
        history.pop();
        const failed = addMessage("assistant", error.message || "Sorry, something went wrong. Please try again.");
        failed.classList.add("is-error");
      } finally {
        waiting = false;
        sendButton.disabled = false;
        input.focus();
      }
    });
  })();
});
