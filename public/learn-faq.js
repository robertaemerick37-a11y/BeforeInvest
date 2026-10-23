      document.addEventListener("DOMContentLoaded", () => {
        const faqData = {
          general: {
            title: "General",
            items: [
              { q: "What is DuaneCapital?", a: "DuaneCapital is an education-first platform that breaks investing concepts down into plain language, so you understand a product before you decide anything." },
              { q: "Is DuaneCapital a broker or a bank?", a: "No. We don't hold funds, manage accounts, or execute trades. We explain how different investments work so you can make informed choices wherever you invest." },
              { q: "Do you give personalised financial advice?", a: "No. Everything here is general information, not advice tailored to your circumstances. Speak with a licensed advisor for recommendations specific to you." },
              { q: "Is DuaneCapital free to use?", a: "Yes. Every article and FAQ on this site is free to read, with no account required." },
            ],
          },
          security: {
            title: "Security",
            items: [
              { q: "How do I know if an investment is a scam?", a: "Be wary of guaranteed high returns, pressure to act immediately, and requests to pay in gift cards or crypto to \u201cunlock\u201d your funds." },
              { q: "Should I ever share my one-time password (OTP) with anyone?", a: "No. Legitimate platforms never ask for your OTP or password over phone, email, or chat." },
              { q: "How can I protect my account?", a: "Use a unique password for each site, turn on two-factor authentication where it's offered, and avoid reusing passwords." },
              { q: "What should I do if I suspect fraud?", a: "Stop the transaction if you still can, change your passwords immediately, and report it to your bank or the relevant regulator." },
            ],
          },
          account: {
            title: "Account & Registration",
            items: [
              { q: "How do I register?", a: "Click Register, enter your details, and verify your email or phone number to activate your account." },
              { q: "What documents do I need for verification (KYC)?", a: "Typically a valid ID and proof of address, though exact requirements vary by provider and investment type." },
              { q: "How long does verification usually take?", a: "It varies \u2014 anywhere from a few minutes for automated checks to a few business days for manual review." },
              { q: "Can I use the site without registering?", a: "Yes. All educational content here is open to everyone; an account is only needed with a provider you choose to invest through." },
            ],
          },
          "treasury-bills": {
            title: "Treasury Bills",
            items: [
              { q: "What is a treasury bill?", a: "A short-term debt instrument issued by a government, sold at a discount and repaid at face value when it matures." },
              { q: "How do returns on treasury bills work?", a: "You buy below face value and receive the full face value at maturity \u2014 the difference between the two is your return." },
              { q: "What is the typical duration of a treasury bill?", a: "Usually a few months up to a year, depending on the specific instrument on offer." },
              { q: "Are treasury bills risk-free?", a: "They carry very low default risk since a government backs them, but you can still lose purchasing power to inflation." },
            ],
          },
          "stocks-etfs": {
            title: "Stocks & ETFs",
            items: [
              { q: "What is a stock?", a: "A stock represents partial ownership in a company, giving you a claim on its profits and assets." },
              { q: "What is an ETF?", a: "An exchange-traded fund holds a basket of assets, such as stocks or bonds, and trades on an exchange like a single stock." },
              { q: "How is an ETF different from a mutual fund?", a: "ETFs trade throughout the day at market prices, while mutual funds are priced and traded just once per day." },
              { q: "Can the value of stocks or ETFs go down?", a: "Yes. Prices can fall as well as rise, and you could get back less than you originally put in." },
            ],
          },
          "fixed-term-notes": {
            title: "Fixed Term Notes",
            items: [
              { q: "What is a fixed term note?", a: "A debt investment where you lend money for a set period in exchange for a fixed interest rate." },
              { q: "Can I withdraw before the term ends?", a: "Usually not without a penalty \u2014 funds are generally locked until the note matures." },
              { q: "How is the interest rate determined?", a: "It's typically set upfront and depends on the term length and the issuer's creditworthiness." },
              { q: "Who typically issues fixed term notes?", a: "Banks, corporations, and other institutions looking to raise short- to medium-term funding." },
            ],
          },
          "commercial-papers": {
            title: "Commercial Papers",
            items: [
              { q: "What is a commercial paper?", a: "A short-term, unsecured debt instrument that companies issue to fund near-term needs like payroll or inventory." },
              { q: "How long do commercial papers usually last?", a: "Typically a few days up to 270 days, though the exact range varies by market." },
              { q: "Are commercial papers insured?", a: "No, they're unsecured, so your return depends on the issuing company's ability to repay." },
              { q: "Why would a company issue commercial paper instead of taking a bank loan?", a: "It can be a cheaper and faster way to raise short-term funds than a traditional loan." },
            ],
          },
          "usd-bonds": {
            title: "USD Bonds",
            items: [
              { q: "What is a USD bond?", a: "A bond denominated in US dollars, which can expose you to currency movements if your home currency is different." },
              { q: "Why would someone invest in USD bonds?", a: "To diversify currency exposure, or to seek relative stability if the US dollar is viewed as steadier than their local currency." },
              { q: "What risks come with USD bonds?", a: "Currency fluctuations, interest rate changes, and the issuer's credit risk can all affect your returns." },
              { q: "How do I receive returns from a USD bond?", a: "Usually through periodic interest payments in US dollars, plus the return of your principal at maturity." },
            ],
          },
          crypto: {
            title: "Cryptocurrencies",
            items: [
              { q: "What is a cryptocurrency?", a: "A digital asset secured by cryptography, usually built on a decentralised network called a blockchain." },
              { q: "Are cryptocurrencies regulated the same way as stocks or bonds?", a: "Regulation varies widely by country and is still evolving, so investor protections can be far more limited." },
              { q: "Why are cryptocurrencies considered high risk?", a: "Prices can swing dramatically over short periods, and the projects behind them vary widely in maturity and track record." },
              { q: "How should I store cryptocurrency safely?", a: "Consider a reputable wallet, enable strong security features, and never share your private keys or recovery phrase with anyone." },
            ],
          },
          "real-estate": {
            title: "Real Estate",
            items: [
              { q: "What are the main ways to invest in real estate?", a: "Buying property directly, or investing indirectly through a Real Estate Investment Trust (REIT)." },
              { q: "What is a REIT?", a: "A company that owns or finances income-producing real estate, letting you invest without buying property yourself." },
              { q: "What costs should I expect with direct property investment?", a: "Beyond the purchase price, budget for maintenance, taxes, agent fees, and periods without tenants." },
              { q: "Is real estate a liquid investment?", a: "Generally no \u2014 selling a property can take weeks to months, unlike stocks that trade almost instantly." },
            ],
          },
          metals: {
            title: "Precious Metals",
            items: [
              { q: "Why do people invest in precious metals like gold?", a: "Many see them as a store of value or a hedge against inflation and currency weakness." },
              { q: "What are the ways to invest in metals?", a: "Physical bullion, metal-backed funds or ETFs, or shares in mining companies." },
              { q: "Do precious metals pay interest or dividends?", a: "Physical metals don't generate income on their own; only certain fund or mining-share structures might." },
              { q: "What costs come with holding physical metals?", a: "Storage, insurance, and the gap between buy and sell prices can all reduce your effective return." },
            ],
          },
        };

        const categoryKeywords = {
          general: "about platform who runs this",
          security: "scam scams fraud password otp phishing safe safety protect",
          account: "register registration sign up signup login kyc verify verification",
          "treasury-bills": "tbill t-bill treasury bill bills government",
          "stocks-etfs": "shares share stock stocks equity equities exchange traded fund etf etfs",
          "fixed-term-notes": "fixed deposit term deposit note notes lock locked",
          "commercial-papers": "commercial paper papers cp corporate",
          "usd-bonds": "bond bonds dollar dollars usd foreign currency fx",
          crypto: "bitcoin btc ether eth coin coins token tokens digital currency blockchain wallet",
          "real-estate": "property properties house houses land reit rent rental",
          metals: "gold silver bullion precious metal metals",
        };

        function searchFaq(rawQuery) {
          const query = rawQuery.toLowerCase().trim();
          if (!query) return [];
          const words = query.split(/\s+/).filter(Boolean);
          const results = [];

          Object.entries(faqData).forEach(([key, category]) => {
            const extra = categoryKeywords[key] || "";
            category.items.forEach((item) => {
              const haystack = `${category.title} ${item.q} ${item.a} ${extra}`.toLowerCase();
              let score = 0;
              if (haystack.includes(query)) score += 10;
              words.forEach((word) => {
                if (word.length > 1 && haystack.includes(word)) score += 1;
              });
              if (score > 0) {
                results.push({ key, category: category.title, q: item.q, a: item.a, score });
              }
            });
          });

          return results.sort((a, b) => b.score - a.score);
        }

        const grid = document.querySelector("#faq-grid");
        const overlay = document.querySelector("#faqOverlay");
        const panel = document.querySelector("#faqPanel");
        const panelTitle = document.querySelector("#faqPanelTitle");
        const panelList = document.querySelector("#faqPanelList");
        const panelClose = document.querySelector("#faqPanelClose");

        if (grid) {
          grid.innerHTML = Object.entries(faqData)
            .map(([key, category]) => {
              const first = category.items[0];
              return `
                <article class="faq-card" id="${key}">
                  <h2>${category.title}</h2>
                  <div class="faq-card-preview">
                    <strong>${first.q}</strong>
                    <p>${first.a}</p>
                  </div>
                  <button class="faq-view-all" type="button" data-category="${key}">View all</button>
                </article>
              `;
            })
            .join("");
          window.applyScrollReveal?.(grid);
        }

        function renderPanelItems(items, showCategory) {
          panelList.innerHTML = items
            .map(
              (item, index) => `
                <div class="faq-item">
                  ${showCategory ? `<span class="faq-item-category">${item.category}</span>` : ""}
                  <button class="faq-item-question" type="button" aria-expanded="false" data-index="${index}">
                    <span>${item.q}</span>
                    <svg class="faq-chevron" viewBox="0 0 12 8" aria-hidden="true"><path d="M1 1.5 6 6.5 11 1.5" /></svg>
                  </button>
                  <div class="faq-item-answer">
                    <p>${item.a}</p>
                  </div>
                </div>
              `
            )
            .join("");

          panelList.querySelectorAll(".faq-item-question").forEach((button) => {
            button.addEventListener("click", () => {
              const isOpen = button.getAttribute("aria-expanded") === "true";
              button.setAttribute("aria-expanded", String(!isOpen));
              button.parentElement.classList.toggle("is-open", !isOpen);
            });
          });
        }

        function openPanel(categoryKey) {
          const category = faqData[categoryKey];
          if (!category) return;
          panelTitle.textContent = category.title;
          renderPanelItems(category.items);
          overlay.classList.add("is-open");
          document.body.style.overflow = "hidden";
          panelClose?.focus();
        }

        function closePanel() {
          overlay.classList.remove("is-open");
          document.body.style.overflow = "";
        }

        function openSearchResults(query) {
          const results = searchFaq(query);

          if (results.length) {
            panelTitle.textContent = `Results for \u201c${query}\u201d`;
            renderPanelItems(results.slice(0, 12), true);
          } else {
            panelTitle.textContent = `Nothing exact for \u201c${query}\u201d \u2014 here's what's closest`;
            const fallback = Object.values(faqData).map((category) => ({
              category: category.title,
              q: category.items[0].q,
              a: category.items[0].a,
            }));
            renderPanelItems(fallback, true);
          }

          overlay.classList.add("is-open");
          document.body.style.overflow = "hidden";
          panelClose?.focus();
        }

        const learnSearchForm = document.querySelector("#learnSearchForm");
        const learnSearchInput = document.querySelector("#learnSearchInput");
        const learnSearchHint = document.querySelector("#learnSearchHint");

        learnSearchForm?.addEventListener("submit", (event) => {
          event.preventDefault();
          const query = learnSearchInput.value.trim();
          if (!query) return;

          const count = searchFaq(query).length;
          learnSearchHint.textContent = count
            ? `${count} result${count === 1 ? "" : "s"} for \u201c${query}\u201d.`
            : `No exact match for \u201c${query}\u201d \u2014 showing related topics.`;

          openSearchResults(query);
        });

        grid?.addEventListener("click", (event) => {
          const button = event.target.closest(".faq-view-all");
          if (button) openPanel(button.dataset.category);
        });

        panelClose?.addEventListener("click", closePanel);

        overlay?.addEventListener("click", (event) => {
          if (event.target === overlay) closePanel();
        });

        document.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && overlay.classList.contains("is-open")) closePanel();
        });

        function openFromHash() {
          const key = decodeURIComponent(window.location.hash.replace("#", ""));
          if (key && faqData[key]) openPanel(key);
        }

        openFromHash();
        window.addEventListener("hashchange", openFromHash);
      });
