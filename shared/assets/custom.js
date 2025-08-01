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

document.addEventListener("mouseenter", (event) => {
  const target = event.target;

  if (target.classList.contains("carousel-items-container")) {
    if (target.classList.contains("hover")) {
      return;
    }
    target.classList.add("hover");
    target.addEventListener("wheel", handleScroll, { passive: false });
    target.addEventListener("mouseleave", () => {
      target.classList.remove("hover");
      target.removeEventListener("wheel", handleScroll);
    }, { once: true });
  }
}, true);

function handleScroll(event) {
  event.preventDefault();

  // Enhanced scroll speed factors with smoother transitions
  const deltaFactor = {
    0: 0.8,    // Pixel mode - slightly reduced for more control
    1: 12,     // Line mode - adjusted for better feel
    2: 80,     // Page mode - reduced for smoother scrolling
  };

  // Improved delta calculation with acceleration curve
  let delta = event.deltaY * (deltaFactor[event.deltaMode] || 0.8);
  const acceleration = Math.min(Math.abs(delta) / 100, 1.5);
  delta = Math.sign(delta) * Math.min(Math.abs(delta) * acceleration, 120);

  const container = event.target.closest(".carousel-items-container");
  if (!container) return;

  /*
  // Enhanced boundary detection with buffer zone
  const bufferZone = 2; // pixels
  const isAtEnd = container.scrollWidth - container.scrollLeft - container.clientWidth <= bufferZone;
  const isAtStart = container.scrollLeft <= bufferZone;

  const isScrollingForward = delta > 0;
  const isScrollingBackward = delta < 0;

  // Improved boundary handling with gradual slowdown
  if (isAtEnd && isScrollingForward || isAtStart && isScrollingBackward) {
    container.classList.remove("hover");
    container.removeEventListener("wheel", handleScroll);
    return;
  }
  */

  // Smoother scroll with dynamic behavior
  container.scrollBy({
    left: delta,
    behavior: container.scrollWidth > container.clientWidth * 3 ? "auto" : "smooth"
  });
}
