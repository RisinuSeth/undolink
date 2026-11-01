(() => {
  const form = document.getElementById("unlock-form");
  if (!form) return;

  const button = document.getElementById("unlock-submit");
  const message = document.getElementById("unlock-message");
  const originalLabel = button.textContent;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.hidden = true;
    message.textContent = "";
    button.disabled = true;
    button.textContent = "Checking…";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store"
      });
      const result = await response.json();

      if (response.ok && result.ok === true && typeof result.redirectTo === "string") {
        const target = new URL(result.redirectTo);
        if (target.protocol === "http:" || target.protocol === "https:") {
          window.location.assign(target.href);
          return;
        }
      }

      message.textContent = result.error || "We couldn't verify that password. Please try again.";
      message.hidden = false;
    } catch {
      message.textContent = "Connection problem. Please check your internet and try again.";
      message.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  });
})();
