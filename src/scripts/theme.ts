const toggle = document.getElementById("theme-toggle") as HTMLButtonElement;

function getTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function setTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  toggle.setAttribute("aria-checked", String(theme === "dark"));
}

// Init aria state
toggle.setAttribute("aria-checked", String(getTheme() === "dark"));

toggle.addEventListener("click", () => {
  setTheme(getTheme() === "dark" ? "light" : "dark");
});

// Listen for system preference changes (only if user hasn't manually set)
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) {
    setTheme(e.matches ? "dark" : "light");
  }
});
