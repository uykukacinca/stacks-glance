document.addEventListener("click", handleClick, false);

function handleClick(event) {
  const { target } = event;

  if (target.classList.contains("monitor-site")) {
    handleMonitorURL(target);
  } else if (target.classList.contains("glimpse-copy")) {
    handleCopy(target);
  }
}

function handleMonitorURL(target) {
  const anchor = target.querySelector("div > a");
  if (anchor) anchor.click();
}

function handleCopy(target) {
  const textData = target.dataset.clipboard;
  const textDiv = target.previousElementSibling;
  const icon = target.querySelector(".glimpse-icon");

  if (
    !textData &&
    (!textDiv || !textDiv.classList.contains("glimpse-clipboard"))
  ) {
    return;
  }

  const text = textData || textDiv.textContent;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log("Text copied to clipboard:", text);
      toggleIconClass(icon, "color-positive");
    })
    .catch((err) => {
      console.error("Failed to copy text:", err);
      toggleIconClass(icon, "color-negative");
    });
}

function toggleIconClass(icon, className) {
  if (!icon) return;

  icon.classList.add(className);
  setTimeout(() => {
    icon.classList.remove(className);
  }, 1500);
}
