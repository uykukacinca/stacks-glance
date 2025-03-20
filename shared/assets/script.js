dayjs.extend(window.dayjs_plugin_relativeTime);
setInterval(render, 1000);

function render() {
  var elemets = document.querySelectorAll(".dayjs-time");
  if (elemets) {
    for (let i = 0; i < elemets.length; i++) {
      const element = elemets[i];
      const timestamp = element.getAttribute("date");
      element.querySelector(".date").textContent =
        "Ends " + dayjs(timestamp).fromNow();
      element.querySelector(".popover").textContent =
        dayjs(timestamp).toString();
    }
  }
}

document.addEventListener(
  "click",
  function (event) {
    let { target } = event;
    let { classList } = target;

    if (classList.contains("monitor-site")) {
      let anchor = target.querySelector("div > a");
      anchor.click();
    }

    if (classList.contains("glance-copy")) {
      const textDiv = target.previousElementSibling;

      if (textDiv && textDiv.classList.contains("text")) {
        const text = textDiv.textContent;
        navigator.clipboard
          .writeText(text)
          .then(() => {
            console.log("Text copied to clipboard:", text);
            target.classList.add("color-positive");
            setTimeout(() => {
              target.classList.remove("color-positive");
            }, 1500);
          })
          .catch((err) => {
            console.error("Failed to copy text:", err);
            target.classList.add("color-negative");
            setTimeout(() => {
              target.classList.remove("color-negative");
            }, 1500);
          });
      }
    }
  },
  false
);
