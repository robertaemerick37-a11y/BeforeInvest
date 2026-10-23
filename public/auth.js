// Client-side validation and backend authentication integration
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  window.addEventListener("pageshow", (event) => {
    const navigationType = performance.getEntriesByType("navigation")[0]?.type;
    if (!event.persisted && navigationType !== "back_forward") return;
    if (localStorage.getItem("userRole") !== "admin") return;

    localStorage.removeItem("userRole");
    localStorage.removeItem("token");
    fetch("/api/logout", { method: "POST", cache: "no-store" }).catch(() => {});
  });

  // ---- Password show/hide ----
  document.querySelectorAll(".auth-password-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.for);
      if (!input) return;
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      btn.innerHTML = showing
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.6 20.6 0 0 1 5.06-5.94M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 7 11 7a20.6 20.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
    });
  });

  // ---- Field-level validation ----
  function setError(field, message) {
    const wrap = field.closest(".auth-field");
    if (!wrap) return;
    const errorEl = wrap.querySelector(".auth-field-error");
    if (message) {
      wrap.classList.add("has-error");
      if (errorEl) errorEl.textContent = message;
    } else {
      wrap.classList.remove("has-error");
    }
  }

  function validateField(field) {
    if (!field.checkValidity()) {
      if (field.validity.valueMissing) setError(field, "This field is required.");
      else if (field.validity.typeMismatch) setError(field, "That doesn't look right.");
      else if (field.validity.tooShort) setError(field, `Needs at least ${field.minLength} characters.`);
      else if (field.validity.patternMismatch) setError(field, field.dataset.patternMessage || "Please check this field.");
      else setError(field, "Please check this field.");
      return false;
    }
    setError(field, "");
    return true;
  }

  function validatePasswordMatch(passField, confirmField) {
    if (confirmField.value && passField.value !== confirmField.value) {
      setError(confirmField, "Passwords don't match.");
      return false;
    }
    return true;
  }

  document.querySelectorAll(".auth-field input, .auth-field select").forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => {
      if (field.closest(".auth-field").classList.contains("has-error")) validateField(field);
    });
  });

  // ---- Multi-step register form ----
  const steps = [...document.querySelectorAll(".auth-step")];
  const fieldsets = [...document.querySelectorAll(".auth-fieldset")];
  let currentStep = 0;

  function goToStep(index) {
    currentStep = index;
    fieldsets.forEach((fs, i) => fs.classList.toggle("is-active", i === index));
    steps.forEach((s, i) => {
      s.classList.toggle("is-active", i === index);
      s.classList.toggle("is-done", i < index);
    });
  }

  function validateStepForward(stepIndex) {
    const fieldset = fieldsets[stepIndex];
    if (!fieldset) return true;
    const requiredFields = [...fieldset.querySelectorAll("input[required], select[required]")].filter(
      (f) => f.offsetParent !== null
    );
    let allValid = true;
    requiredFields.forEach((f) => {
      if (!validateField(f)) allValid = false;
    });
    const pass = fieldset.querySelector('[data-role="password"]');
    const confirm = fieldset.querySelector('[data-role="confirm-password"]');
    if (pass && confirm && !validatePasswordMatch(pass, confirm)) allValid = false;
    return allValid;
  }

  document.querySelectorAll("[data-step-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (validateStepForward(currentStep) && currentStep < fieldsets.length - 1) {
        goToStep(currentStep + 1);
      }
    });
  });

  document.querySelectorAll("[data-step-back]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (currentStep > 0) goToStep(currentStep - 1);
    });
  });

  document.querySelectorAll("[data-step-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      goToStep(Number(btn.dataset.stepGoto));
    });
  });

  // ---- Session Helper ----
  async function saveSessionData(form, role) {
    localStorage.removeItem("token");
    let existing = null;
    try {
      existing = JSON.parse(localStorage.getItem("kbiUser") || "null");
    } catch {
      existing = null;
    }

    if (role) {
      localStorage.setItem("userRole", role);
    }

    const loginEmail = form.querySelector('input[name="email"]')?.value || "";
    if (existing?.email && existing.email.toLowerCase() === loginEmail.toLowerCase()) {
      const legacyFields = [
        "fullName", "phone", "secretQuestion", "secretAnswer", "sex", "dateOfBirth",
        "nationality", "birthCountry", "townOfBirth", "occupation", "incomeBand",
      ];
      const legacyProfile = Object.fromEntries(
        legacyFields.filter((field) => typeof existing[field] === "string").map((field) => [field, existing[field]]),
      );
      const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(legacyProfile),
      });
      if (!response.ok) throw new Error("Could not migrate existing profile information.");
    }

    localStorage.removeItem("kbiUser");
  }

  async function finishLogin(form, role) {
    await saveSessionData(form, role);
    document.querySelector("[data-loading]")?.classList.add("is-active");
    window.setTimeout(() => {
      window.location.href = role === "admin" ? "admin.html" : "profile.html";
    }, 700);
  }

  let pendingAdminChallengeId = "";

  // ---- Form submit connected to Express Backend ----
  document.querySelectorAll("form[data-auth-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const activeFieldset = form.querySelector(".auth-fieldset.is-active") || form;
      const requiredFields = [...activeFieldset.querySelectorAll("input[required], select[required]")]
        .filter((f) => f.offsetParent !== null);
      let allValid = true;
      requiredFields.forEach((f) => {
        if (!validateField(f)) allValid = false;
      });
      const pass = form.querySelector('[data-role="password"]');
      const confirm = form.querySelector('[data-role="confirm-password"]');
      if (pass && confirm && !validatePasswordMatch(pass, confirm)) allValid = false;

      const terms = form.querySelector('[data-role="terms"]');
      if (terms && !terms.checked) {
        terms.closest(".auth-field")?.classList.add("has-error");
        allValid = false;
      }

      if (!allValid) return;

      const submitBtn = form.querySelector(".auth-submit");
      const originalText = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Please wait…";
      }

      // Collect form inputs
      const emailInput = form.querySelector('input[type="email"], input[name="email"]');
      const passwordInput = form.querySelector('[data-role="password"]') || form.querySelector('input[type="password"]');

      const email = emailInput ? emailInput.value : "";
      const password = passwordInput ? passwordInput.value : "";
      const formType = form.dataset.authForm; // "register" or "login"

      const endpoint = formType === "register" ? "/api/register" : "/api/login";
      const requestBody = { email, password };
      if (formType === "register") {
        const formData = new FormData(form);
        requestBody.profile = {
          fullName: String(formData.get("fullName") || ""),
          phone: String(formData.get("phone") || ""),
          secretQuestion: String(formData.get("secretQuestion") || ""),
          secretAnswer: String(formData.get("secretAnswer") || ""),
        };
      }

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok) {
          alert(data.error || "An error occurred. Please try again.");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }
          return;
        }

        if (formType === "register") {
          alert("Registration successful! Please log in.");
          window.location.href = "login.html";
          return;
        }

        if (data.requiresTwoFactor) {
          pendingAdminChallengeId = data.challengeId;
          form.hidden = true;
          document.querySelector("#admin-verification-form").hidden = false;
          document.querySelector("#adminVerificationCode").focus();
          return;
        }

        await finishLogin(form, data.role);

      } catch (err) {
        console.error("Network or server error:", err);
        alert("Server error. Please make sure your backend is running.");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  });

  const verificationForm = document.querySelector("#admin-verification-form");
  const verificationStatus = document.querySelector("#admin-verification-status");
  const loginForm = document.querySelector('form[data-auth-form="login"]');
  const forgotPasswordForm = document.querySelector("#forgot-password-form");
  const resetPasswordForm = document.querySelector("#password-reset-form");
  const resetSuccess = document.querySelector("#password-reset-success");
  const resetRequestStatus = document.querySelector("#reset-request-status");
  const resetPasswordStatus = document.querySelector("#password-reset-status");
  let resetToken = new URLSearchParams(window.location.search).get("reset") || "";

  if (resetToken) {
    loginForm.hidden = true;
    resetPasswordForm.hidden = false;
    resetPasswordForm.elements.namedItem("password").focus();
  }

  document.querySelector("[data-forgot-password]")?.addEventListener("click", (event) => {
    event.preventDefault();
    loginForm.hidden = true;
    verificationForm.hidden = true;
    forgotPasswordForm.hidden = false;
    const emailInput = document.querySelector("#loginEmail");
    forgotPasswordForm.elements.namedItem("email").value = emailInput.value;
    forgotPasswordForm.elements.namedItem("email").focus();
  });

  forgotPasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = forgotPasswordForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    resetRequestStatus.classList.remove("is-success");
    resetRequestStatus.textContent = "Requesting reset link...";
    try {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordForm.elements.namedItem("email").value.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not request a reset link.");
      resetRequestStatus.classList.add("is-success");
      resetRequestStatus.textContent = data.message;
    } catch (error) {
      resetRequestStatus.textContent = error.message || "Could not request a reset link. Try again later.";
    } finally {
      submitButton.disabled = false;
    }
  });

  resetPasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const passwordInput = resetPasswordForm.elements.namedItem("password");
    const confirmInput = resetPasswordForm.elements.namedItem("confirmPassword");
    if (!resetToken) {
      resetPasswordStatus.textContent = "This reset link is missing or invalid. Request a new one.";
      return;
    }
    if (!passwordInput.checkValidity() || passwordInput.value !== confirmInput.value) {
      resetPasswordStatus.textContent = passwordInput.value !== confirmInput.value
        ? "The passwords do not match."
        : "Use a password between 12 and 72 characters."
      return;
    }

    const submitButton = resetPasswordForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    resetPasswordStatus.textContent = "Updating password...";
    try {
      const response = await fetch("/api/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: passwordInput.value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update your password.");
      resetToken = "";
      window.history.replaceState({}, document.title, window.location.pathname);
      resetPasswordForm.hidden = true;
      resetSuccess.hidden = false;
    } catch (error) {
      resetPasswordStatus.textContent = error.message || "Could not update your password. Request a new link.";
    } finally {
      submitButton.disabled = false;
    }
  });

  document.querySelectorAll("[data-back-to-login]").forEach((button) => {
    button.addEventListener("click", () => {
      resetToken = "";
      window.history.replaceState({}, document.title, window.location.pathname);
      forgotPasswordForm.hidden = true;
      resetPasswordForm.hidden = true;
      resetSuccess.hidden = true;
      if (loginForm) loginForm.hidden = false;
      resetRequestStatus.textContent = "";
      resetPasswordStatus.textContent = "";
    });
  });

  verificationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const codeInput = verificationForm.elements.namedItem("code");
    const submitButton = verificationForm.querySelector('[type="submit"]');
    if (!pendingAdminChallengeId || !codeInput.checkValidity()) {
      verificationStatus.textContent = "Enter the six-digit code from your email.";
      return;
    }

    submitButton.disabled = true;
    verificationStatus.classList.remove("is-success");
    verificationStatus.textContent = "Verifying code...";
    try {
      const response = await fetch("/api/login/verify-admin-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: pendingAdminChallengeId, code: codeInput.value.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verification failed.");
      pendingAdminChallengeId = "";
      verificationStatus.classList.add("is-success");
      verificationStatus.textContent = "Verified. Signing you in...";
      await finishLogin(loginForm, data.role);
    } catch (error) {
      verificationStatus.textContent = error.message || "Verification failed. Try signing in again.";
      codeInput.value = "";
      codeInput.focus();
    } finally {
      submitButton.disabled = false;
    }
  });

  document.querySelector("[data-cancel-admin-verification]")?.addEventListener("click", () => {
    pendingAdminChallengeId = "";
    verificationForm.hidden = true;
    verificationForm.reset();
    verificationStatus.textContent = "";
    const loginSubmitButton = loginForm?.querySelector('[type="submit"]');
    if (loginSubmitButton) {
      loginSubmitButton.disabled = false;
      loginSubmitButton.textContent = "Log in";
    }
    if (loginForm) loginForm.hidden = false;
  });
});