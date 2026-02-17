const filterBtns = document.querySelectorAll<HTMLButtonElement>("#project-filters .filter-chip");
const projectCards = document.querySelectorAll<HTMLElement>("#projects-list .project-card");

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Update active state
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const filter = btn.dataset.filter!;

    projectCards.forEach((card) => {
      if (filter === "all") {
        card.style.display = "";
      } else {
        const tags = card.dataset.tags?.split(",") ?? [];
        card.style.display = tags.includes(filter) ? "" : "none";
      }
    });
  });
});
