const NTFY = {
  topics: ["komodo", "zerobyte"],
  hostname: NTFY_URL,
  wsReconnectDelay: 3000,
  maxReconnectAttempts: 5,

  get messagesURL() {
    return `${this.hostname}/${this.topics}/json?poll=1&since=24h`;
  },

  get subscribeURL() {
    return `wss://${this.hostname}/${this.topics}/ws`;
  },

  renderMessage: (item) => `<div class="flex items-center gap-10 glimpse-user">
  <div class="glimpse-user-avatar shrink-0">
    <img class="glimpse-image avatar" src="${ICONS_URL}/${item.topic}" alt="">
  </div>
  <div class="glimpse-user-card">
    <div class="flex items-center gap-7">${item.title}</div>
    <div class="shrink-0">${item.message}</div>
  </div>
</div>`,

  bellIcon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6" style="width: 2rem;">
  <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
</svg>`,
};

/**
 * Fetch and process an NDJSON stream
 * @param {string} url - The URL to fetch from
 * @param {Function} processLine - Callback function to process each line
 * @returns {Promise<boolean>} True if response was successful
 */
async function fetchNdjsonStream(url, processLine) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/x-ndjson",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining data in the buffer
        if (buffer.trim().length > 0) {
          try {
            processLine(JSON.parse(buffer));
          } catch (e) {
            console.error("Error parsing final buffer:", buffer, e);
          }
        }
        break;
      }

      // Decode the chunk of Uint8Array data into a string
      buffer += decoder.decode(value, { stream: true });

      // Split the buffer by newline, keeping the last (possibly incomplete) part
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop(); // The last element is the remaining buffer

      // Process the complete lines
      for (const line of lines) {
        if (line.trim().length > 0) {
          try {
            const jsonObject = JSON.parse(line);
            processLine(jsonObject);
          } catch (e) {
            console.error("Error parsing JSON line from stream:", line, e);
          }
        }
      }
    }

    return response.ok;
  } catch (error) {
    console.error("Error fetching NDJSON stream:", error);
    return false;
  }
}

/**
 * Initialize WebSocket connection for real-time notifications
 * @param {HTMLElement} eventsContainer - Container to append new messages to
 * @param {number} reconnectAttempt - Current reconnection attempt number
 */
function initializeWebSocket(eventsContainer, reconnectAttempt = 0) {
  if (reconnectAttempt > NTFY.maxReconnectAttempts) {
    console.error(
      `Max reconnection attempts (${NTFY.maxReconnectAttempts}) reached. Stopping.`,
    );
    return;
  }

  const websocket = new WebSocket(NTFY.subscribeURL);

  // Connection established
  websocket.onopen = () => {
    console.log(
      `WebSocket connected to ${NTFY.subscribeURL} at ${new Date().toISOString()}`,
    );
  };

  // Handle errors
  websocket.onerror = (error) => {
    console.error(`WebSocket error: ${error.type || "Unknown error"}`);
  };

  // Handle connection close and attempt reconnection
  websocket.onclose = () => {
    console.warn(
      `WebSocket disconnected. Reconnecting in ${NTFY.wsReconnectDelay}ms...`,
    );
    const nextAttempt = reconnectAttempt + 1;
    setTimeout(() => {
      initializeWebSocket(eventsContainer, nextAttempt);
    }, NTFY.wsReconnectDelay);
  };

  // Handle incoming messages
  websocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === "message") {
        const messageHTML = NTFY.renderMessage(data);
        // Use setTimeout to defer DOM manipulation if document is locked
        if (document.readyState === "loading") {
          setTimeout(() => {
            try {
              eventsContainer.insertAdjacentHTML("beforebegin", messageHTML);
            } catch (e) {
              console.warn(
                "Deferred DOM insertion still failed, queuing:",
                e.message,
              );
            }
          }, 0);
        } else {
          eventsContainer.insertAdjacentHTML("beforebegin", messageHTML);
        }
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  };
}

async function init() {
  try {
    const eventsContainer = document.createElement("div");
    eventsContainer.setAttribute("data-popover-html", "");

    const container = document.createElement("div");
    container.setAttribute("data-popover-type", "html");
    container.setAttribute("data-popover-position", "above");
    container.setAttribute("data-popover-max-width", "400px");

    container.insertAdjacentHTML("beforeend", NTFY.bellIcon);
    container.appendChild(eventsContainer);
    // Setup UI

    // Fetch historical messages
    await fetchNdjsonStream(NTFY.messagesURL, (dataObject) => {
      if (dataObject.event === "message") {
        const messageHTML = NTFY.renderMessage(dataObject);
        // Safely insert with error handling
        try {
          eventsContainer.insertAdjacentHTML("beforeend", messageHTML);
        } catch (e) {
          console.warn("Failed to insert message, deferring:", e.message);
          // Defer if document is locked
          setTimeout(() => {
            try {
              eventsContainer.insertAdjacentHTML("beforeend", messageHTML);
            } catch (retryError) {
              console.error(
                "Failed to insert message even after defer:",
                retryError,
              );
            }
          }, 100);
        }
      }
    });

    const header = document.body.querySelector(".header-container > .header");
    console.log(document);

    if (!header) {
      console.warn("Header container not found");
      return;
    }
    header.appendChild(container);

    // Initialize WebSocket for real-time updates
    initializeWebSocket(eventsContainer);
  } catch (error) {
    console.error("Error initializing Ntfy widget:", error);
  }
}
init();
