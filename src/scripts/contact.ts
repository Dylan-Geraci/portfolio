const copyBtn = document.getElementById("copy-email") as HTMLButtonElement;
const emailText = document.getElementById("email-text") as HTMLElement;

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(emailText.textContent?.trim() ?? "");
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = "Copy";
      copyBtn.classList.remove("copied");
    }, 2000);
  } catch {
    // Fallback for older browsers
    const range = document.createRange();
    range.selectNodeContents(emailText);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    document.execCommand("copy");
    sel?.removeAllRanges();
    copyBtn.textContent = "Copied!";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = "Copy";
      copyBtn.classList.remove("copied");
    }, 2000);
  }
});
