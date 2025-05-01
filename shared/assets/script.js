document.addEventListener(
  "click",
  function (event) {
    let { target } = event;
    let { classList } = target;

    if (classList.contains("monitor-site")) {
      let anchor = target.querySelector("div > a");
      anchor.click();
    }

    if (classList.contains("glimpse-copy")) {
      const textData = target.dataset.text;
      const textDiv = target.previousElementSibling;

      if (textData || (textDiv && textDiv.classList.contains("text"))) {
        const text = textData || textDiv.textContent;
        navigator.clipboard
          .writeText(text)
          .then(() => {
            console.log("Text copied to clipboard:", text);
            if (textDiv) {
              target.classList.add("color-positive");
              setTimeout(() => {
                target.classList.remove("color-positive");
              }, 1500);
            }
          })
          .catch((err) => {
            console.error("Failed to copy text:", err);
            if (textDiv) {
              target.classList.add("color-negative");
              setTimeout(() => {
                target.classList.remove("color-negative");
              }, 1500);
            }
          });
      }
    }
  },
  false
);
