const CONFIG = {
  id: "glimpse-modal",
  maxHistory: 10,
  loadingTemplate:
    '<div class="glimpse-loading-container"><div class="loading-icon"></div></div>',
  classes: {
    modal: "glimpse-modal",
    scroll: "glimpse-app-scroll",
    loading: "glimpse-loading-container",
    content: "modal-content",
    nav: "modal-nav",
    home: "modal-home",
    back: "modal-back",
    close: "modal-close",
    error: "modal-error",
  },
  attributes: {
    id: "data-glimpse-id",
    widgetContent: "data-glimpse-widget-content",
    modalContent: "data-glimpse-modal-content",
    imageSrc: "data-glimpse-src",
  },
  selectors: {
    modalLoad:
      "button[data-glimpse-modal-content], a[data-glimpse-modal-content]",
    imageLoad: "img.glimpse-image[data-glimpse-src]",
    imageElement: 'img.glimpse-image[data-glimpse-id="{id}"]',
    carousel: ".cards-horizontal.carousel-items-container",
  },
};

class Utils {
  static isProcessed(element) {
    return element.getAttribute("processed") !== null;
  }
  static markAsProcessed(element) {
    element.setAttribute("processed", "");
  }
  static isObserved(element) {
    return element.getAttribute("observed") !== null;
  }
  static markAsObserved(element) {
    element.setAttribute("observed", "");
  }
  static removeObserve(element) {
    element.removeAttribute("observed");
  }

  static lightUp() {
    const elements = document.querySelectorAll(
      ".widget-type-docker-containers.light-up img.docker-container-icon, .widget-type-docker-containers.light-up img.icon",
    );
    elements.forEach((e) => {
      if (/i\.kod/.test(e.src) && !/-light$/.test(e.src)) {
        e.src = e.src + "-light";
      }
    });
  }

  static replaceText() {
    const text = [
      { type: "remove", val: "- Episode Discussion" },
      { type: "remove", val: "- Series Premiere Discussion" },
      {
        type: "extract",
        val: /What are you watching and what do you recommend\? \((.*?)\)/,
      },
    ];
    const elements = document.querySelectorAll(
      ".xxx-replace-text a.size-title-dynamic",
    );
    text.forEach((t) => {
      elements.forEach((e) => {
        if (t.type === "remove") {
          e.textContent = e.textContent.replace(t.val, "").trim();
        } else if (t.type === "extract") {
          let ex = e.textContent.match(t.val);
          if (ex) e.textContent = ex[1].trim();
        }
      });
    });
  }

  static dockerLink() {
    const elements = document.querySelectorAll(
      ".widget-containers-custom .widget-content > ul > li",
    );
    elements.forEach((el) => {
      const link = el.querySelector("div > a");
      if (link) {
        el.addEventListener("click", (e) => link.click(), false);
      }
    });
  }

  static setupMpvHandler() {
    const handler = "mpv-handler://play/";
    document.querySelectorAll(`[href^="${handler}"]`).forEach((el) => {
      const path = el.href.replace(handler, "");
      let data = btoa(path);
      let safe = data
        .replace(/\//g, "_")
        .replace(/\+/g, "-")
        .replace(/\=/g, "");
      el.href = handler + safe;
    });
  }

  static setupCopy() {
    const elements = document.querySelectorAll(".glimpse-clipboard");
    if (!elements.length) return;

    elements.forEach((el) => {
      el.addEventListener(
        "click",
        (e) => {
          const { target } = e;
          const textDiv = target.querySelector(".glimpse-copy");
          const icon = target.querySelector("svg");

          if (!textDiv || icon.classList.contains("color-positive")) {
            return;
          }

          navigator.clipboard
            .writeText(textDiv.textContent)
            .then(() => {
              console.log("Text copied to clipboard:", textDiv.textContent);
              icon.classList.add("color-positive");
              setTimeout(() => {
                icon.classList.remove("color-positive");
              }, 1500);
            })
            .catch((err) => {
              console.error("Failed to copy text:", err);
            });
        },
        false,
      );
    });
  }
  static async setupEksiSearch() {
    const images = document.querySelectorAll("[data-default-search-url]");
    if (!images.length) return;

    images.forEach((img) => {
      const attr = img.getAttribute("data-default-search-url");
      const isEksi = attr.includes("eksisozluk");
      if (isEksi) {
        const input = img.querySelector("input.search-input");
        const newInput = input.cloneNode(true);
        input.replaceWith(newInput);
        newInput.addEventListener("keydown", (event) => {
          if (event.key == "Enter") {
            event.preventDefault();
            const value = newInput.value.trim();
            const content = "/eksisozluk/search?query=" + value;
            const title = "search: " + value;

            ModalManager.open({
              getAttribute: (attr) => content,
              title,
              classList: {
                contains: (cls) => true,
              },
            });

            return;
          }
        });
      }
    });
  }
}

class Carousel {
  static #scrollConfig = {
    deltaFactors: {
      0: 0.8, // Pixel mode
      1: 12, // Line mode
      2: 80, // Page mode
    },
    maxAcceleration: 1.5,
    maxDelta: 120,
    smoothScrollThreshold: 3, // Multiplier for client width
    debounceTime: 150,
  };

  static #activeScrollers = new WeakSet();
  static #scrollDebounceTimers = new WeakMap();

  static setupHorizontalScroll() {
    const elements = document.querySelectorAll(CONFIG.selectors.carousel);
    if (!elements.length) return;

    elements.forEach((el) => {
      if (this.#activeScrollers.has(el)) return;

      const handleScroll = this.#createScrollHandler(el);
      el.addEventListener("wheel", handleScroll, { passive: false });
      this.#activeScrollers.add(el);

      this.#setupTouchScroll(el);

      new MutationObserver((_, observer) => {
        if (!document.contains(el)) {
          el.removeEventListener("wheel", handleScroll);
          this.#activeScrollers.delete(el);
          observer.disconnect();
        }
      }).observe(document.body, { childList: true, subtree: true });
    });
  }

  static #createScrollHandler(element) {
    return (event) => {
      event.preventDefault();

      const timer = this.#scrollDebounceTimers.get(element);
      if (timer) clearTimeout(timer);

      this.#scrollDebounceTimers.set(
        element,
        setTimeout(() => {
          this.#scrollDebounceTimers.delete(element);
        }, this.#scrollConfig.debounceTime),
      );

      this.#handleHorizontalScroll(event, element);
    };
  }

  static #handleHorizontalScroll(event, container) {
    const { deltaY, deltaMode } = event;
    const { deltaFactors, maxAcceleration, maxDelta } = this.#scrollConfig;

    let delta = deltaY * (deltaFactors[deltaMode] || deltaFactors[0]);
    const acceleration = Math.min(Math.abs(delta) / 100, maxAcceleration);
    delta =
      Math.sign(delta) * Math.min(Math.abs(delta) * acceleration, maxDelta);

    this.#performSmartScroll(container, delta);
  }

  static #performSmartScroll(container, delta) {
    const behavior =
      container.scrollWidth >
      container.clientWidth * this.#scrollConfig.smoothScrollThreshold
        ? "auto"
        : "smooth";

    container.scrollBy({
      left: delta,
      behavior,
    });
  }

  static #setupTouchScroll(element) {
    let startX, startScrollLeft;

    const touchStart = (e) => {
      startX = e.touches[0].pageX;
      startScrollLeft = element.scrollLeft;

      element.style.scrollBehavior = "auto";
      element.style.cursor = "grabbing";
    };

    const touchMove = (e) => {
      if (!startX) return;

      const delta = startX - e.touches[0].pageX;
      element.scrollLeft = startScrollLeft + delta;
    };

    const touchEnd = () => {
      startX = null;
      element.style.scrollBehavior = "";
      element.style.cursor = "";
    };

    element.addEventListener("touchstart", touchStart, { passive: true });
    element.addEventListener("touchmove", touchMove, { passive: true });
    element.addEventListener("touchend", touchEnd, { passive: true });
    element.addEventListener("touchcancel", touchEnd, { passive: true });
  }

  static isScrollable(element) {
    return element.scrollWidth > element.clientWidth;
  }

  static cleanup(element) {
    this.#activeScrollers.delete(element);
    const timer = this.#scrollDebounceTimers.get(element);
    if (timer) {
      clearTimeout(timer);
      this.#scrollDebounceTimers.delete(element);
    }
  }
}

class CollapsibleGrids {
  static #parsePx = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : NaN;
  };

  static #getCardsPerRow(gridElement) {
    const style = getComputedStyle(gridElement);
    const availableWidth = Math.floor(
      gridElement.clientWidth || gridElement.getBoundingClientRect().width,
    );

    let minCardWidth = this.#parsePx(style.getPropertyValue("--min-width"));

    if (!Number.isFinite(minCardWidth) || minCardWidth <= 0) {
      const firstChild = gridElement.querySelector(":scope > *");
      minCardWidth = firstChild
        ? this.#parsePx(
            getComputedStyle(firstChild).getPropertyValue("min-width"),
          ) ||
          firstChild.getBoundingClientRect().width ||
          firstChild.offsetWidth
        : 280;
    }

    minCardWidth =
      Number.isFinite(minCardWidth) && minCardWidth > 0 ? minCardWidth : 280;
    const gap =
      this.#parsePx(style.getPropertyValue("gap")) ||
      this.#parsePx(style.getPropertyValue("column-gap")) ||
      0;

    const cards = Math.floor((availableWidth + gap) / (minCardWidth + gap));
    return Math.max(1, cards);
  }

  static setupCollapsibleGrids() {
    document.querySelectorAll(".x-collapsible").forEach((gridElement) => {
      const collapseAfterRows = parseInt(gridElement.dataset.collapseAfterRows);
      if (collapseAfterRows <= 0 || isNaN(collapseAfterRows)) return;

      const button = this.#attachExpandToggleButton(gridElement);
      let cardsPerRow = this.#getCardsPerRow(gridElement);

      const updateCollapsible = () => {
        requestAnimationFrame(() => {
          const hideItemsAfterIndex = cardsPerRow * collapseAfterRows;
          button.style.display =
            hideItemsAfterIndex >= gridElement.children.length ? "none" : "";

          let row = 0;
          for (let i = 0; i < gridElement.children.length; i++) {
            const child = gridElement.children[i];
            if (i >= hideItemsAfterIndex) {
              child.classList.add("collapsible-item");
              child.style.animationDelay = `${row * 40}ms`;
              if ((i + 1) % cardsPerRow === 0) row++;
            } else {
              child.classList.remove("collapsible-item");
              child.style.animationDelay = "";
            }
          }
        });
      };

      new ResizeObserver(() => {
        if (!gridElement.offsetWidth && !gridElement.offsetHeight) return;
        const newCardsPerRow = this.#getCardsPerRow(gridElement);
        if (newCardsPerRow !== cardsPerRow) {
          cardsPerRow = newCardsPerRow;
          updateCollapsible();
        }
      }).observe(gridElement);

      updateCollapsible();
    });
  }

  static #attachExpandToggleButton(container) {
    let expanded = false;
    const button = document.createElement("button");
    button.className = "expand-toggle-button";
    button.innerHTML = `Show more<span class="expand-toggle-button-icon"></span>`;
    const textNode = button.firstChild;

    button.addEventListener("click", () => {
      expanded = !expanded;
      container.classList.toggle("container-expanded");
      button.classList.toggle("container-expanded");
      textNode.nodeValue = expanded ? "Show less" : "Show more";

      if (expanded) return;

      const topBefore = button.getBoundingClientRect().top;
      container.classList.remove("container-expanded");
      button.classList.remove("container-expanded");

      requestAnimationFrame(() => {
        const topAfter = button.getBoundingClientRect().top;
        if (topAfter < 0) {
          window.scrollBy({ top: topAfter - topBefore, behavior: "instant" });
        }
      });
    });

    container.after(button);
    return button;
  }
}

class ImageLoader {
  static #imageObserver;
  static #imageCache;

  static async #initImageLoader() {
    if (this.#imageObserver) return;

    this.#imageCache = await caches.open("glimpse-cache");
    this.#imageObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.#loadImage(entry.target);
          }
        });
      },
      {
        rootMargin: "150px",
        threshold: 0.1,
      },
    );
  }

  static async #loadImage(imgElement) {
    const id = imgElement?.getAttribute(CONFIG.attributes.id);

    if (!id || !Utils.isObserved(imgElement)) {
      return;
    }

    const allImageElements = document.querySelectorAll(
      CONFIG.selectors.imageElement.replace("{id}", id),
    );

    try {
      const cacheKey = `glimpse-image-${id}`;
      let response = await this.#imageCache.match(cacheKey);

      if (!response) {
        response = await fetch(`${GLIMPSE_URL}/eksisozluk/image/${id}`);
        if (response.ok) {
          await this.#imageCache.put(cacheKey, response.clone());
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.image.source) {
        allImageElements.forEach((el) => {
          el.src = data.image.source;

          el.removeAttribute("data-glimpse-src");
          Utils.removeObserve(el);

          this.#imageObserver.unobserve(el);
        });
      } else {
        throw new Error("API response did not contain an image source.");
      }
    } catch (error) {
      console.error(`Image load error for ID ${id}:`, error);

      allImageElements.forEach((el) => {
        el.classList.add("image-load-error");
        Utils.removeObserve(el);
        this.#imageObserver.unobserve(el);
      });
    }
  }

  static async init() {
    await this.#initImageLoader();

    const images = document.querySelectorAll(CONFIG.selectors.imageLoad);
    if (!images.length) return;

    images.forEach((img) => {
      if (!img?.getAttribute(CONFIG.attributes.id) || Utils.isObserved(img)) {
        return;
      }
      Utils.markAsObserved(img);
      this.#imageObserver.observe(img);
    });
  }
}

class RelativeTime {
  static #config = {
    TIME_UNITS: [
      ["y", 31536000, 3600],
      ["mo", 2592000, 3600],
      ["d", 86400, 120],
      ["h", 3600, 120],
      ["m", 60, 60],
      //["s", 1, 1],
    ],
    selector: "[data-dynamic-relative-time]",
  };

  static get LEN_UNITS() {
    return this.#config.TIME_UNITS.length;
  }

  static get MIN_UNIT() {
    return this.#config.TIME_UNITS[this.LEN_UNITS - 1];
  }

  static timestampToRelativeTime(timestamp, { units = 1, relative = false }) {
    if (!Number.isFinite(timestamp) || timestamp < 0) return "Invalid";

    const normalizedUnits = Math.max(1, Math.min(this.LEN_UNITS, units));
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    const isInFuture = diff < 0;
    const absDiff = Math.abs(diff);

    if (absDiff < this.MIN_UNIT[1]) {
      return relative ? "just now" : `1${this.MIN_UNIT[0]}`;
    }

    const parts = [];
    let remaining = Math.floor(absDiff);

    for (const [label, seconds] of this.#config.TIME_UNITS) {
      if (parts.length >= normalizedUnits) break;

      const count = Math.floor(remaining / seconds);
      if (count > 0) {
        parts.push(`${count}${label}`);
        remaining %= seconds;
      }
    }

    const timeStr = parts.join(" ");

    if (!relative) return timeStr;
    return isInFuture ? `in ${timeStr}` : `${timeStr} ago`;
  }

  static updateRelativeTimeForElements(elements) {
    elements.forEach((element) => {
      const { dynamicRelativeTime, relative, units } = element.dataset;
      if (!dynamicRelativeTime) return;

      const options = {
        units: Number(units) || 1,
        relative: relative === "",
      };

      const formattedTime = this.timestampToRelativeTime(
        Number(dynamicRelativeTime),
        options,
      );

      if (element.textContent !== formattedTime) {
        element.textContent = formattedTime;
      }
    });
  }

  static setupDynamicRelativeTime() {
    let elements = document.querySelectorAll(this.#config.selector);
    if (!elements.length) return;

    elements.forEach((element) => {
      const newEl = element.cloneNode(true);
      element.replaceWith(newEl);
    });

    elements = document.querySelectorAll(this.#config.selector);

    const updateInterval = this.MIN_UNIT[2] * 1_000;
    let lastUpdateTime = Date.now();

    this.updateRelativeTimeForElements(elements);

    const updateElementsAndTimestamp = () => {
      this.updateRelativeTimeForElements(elements);
      lastUpdateTime = Date.now();
    };

    const scheduleRepeatingUpdate = () =>
      setInterval(updateElementsAndTimestamp, updateInterval);

    if (document.hidden === undefined) {
      scheduleRepeatingUpdate();
      return;
    }

    let timeout = scheduleRepeatingUpdate();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearTimeout(timeout);
        return;
      }

      const delta = Date.now() - lastUpdateTime;

      if (delta >= updateInterval) {
        updateElementsAndTimestamp();
        timeout = scheduleRepeatingUpdate();
        return;
      }

      timeout = setTimeout(() => {
        updateElementsAndTimestamp();
        timeout = scheduleRepeatingUpdate();
      }, updateInterval - delta);
    });
  }
}

class YoutubeProgress {
  static #config = {
    api: `https://pb.${HOST_NAME}/api/collections/{collection}/records`,
    records: `https://pb.${HOST_NAME}/youtube-progress`,
    collection: "youtube",
    selectors: {
      videos: ".widget-type-videos a",
      progressBar: ".xxx-progress-bar",
    },
  };

  static get api() {
    return this.#config.api.replace("{collection}", this.#config.collection);
  }

  static async init() {
    const videos = this.#getUnobservedVideos();
    if (!videos.length) return;

    videos.forEach((video) => Utils.markAsObserved(video));
    await this.#processVideos(videos);
    this.#setupProgressListener();
  }

  static #getUnobservedVideos() {
    return Array.from(
      document.querySelectorAll(this.#config.selectors.videos),
    ).filter((a) => a.href?.includes("/watch?") && !Utils.isObserved(a));
  }

  static async #processVideos(videos) {
    const videoData = videos
      .map((a) => ({
        element: a,
        id: this.#extractVideoId(a.href),
      }))
      .filter((v) => v.id);

    const ids = videoData.map((v) => v.id);
    if (ids.length > 0) {
      const url = new URL(this.#config.records);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids }),
        });
        if (response.ok) {
          const data = await response.json();
          const recordsMap = new Map();
          data.forEach((record) => {
            recordsMap.set(record.id, record);
          });
          for (const { element, id } of videoData) {
            const record = recordsMap.get(id);
            if (record) {
              const url = new URL(element.href);
              url.searchParams.set("t", `${record.currentTime}s`);
              element.href = url.toString();
              this.#renderProgressBar(element, record.progress);
            }
          }
          return;
        }
      } catch (error) {
        console.warn("Failed to fetch video records:", error);
      }
    }
  }

  static #extractVideoId(url) {
    try {
      return new URL(url).searchParams.get("v");
    } catch {
      return null;
    }
  }

  static #renderProgressBar(element, progress) {
    const container = document.createElement("div");
    container.className =
      this.#config.selectors.progressBar.replace(".", "") + "-container";

    const bar = document.createElement("div");
    bar.className = this.#config.selectors.progressBar.replace(".", "");
    bar.style.width = `${progress}%`;

    container.appendChild(bar);
    element.insertAdjacentElement("beforebegin", container);
  }

  static #setupProgressListener() {
    window.addEventListener("message", (event) => {
      if (event.data?.type === "youtube-progress-update") {
        const { videoId, progress } = event.data;
        this.#updateProgress(videoId, progress);
      }
    });
  }

  static #updateProgress(videoId, progress) {
    document
      .querySelectorAll(
        `${this.#config.selectors.videos}[href*="?v=${videoId}"]`,
      )
      .forEach((element) => {
        const container = element.previousElementSibling;
        const bar = container?.querySelector(
          this.#config.selectors.progressBar,
        );
        if (bar) {
          bar.style.width = `${progress}%`;
        }
      });
  }
}

class Content {
  static async fetch(contentUrl, signal) {
    const url = new URL(contentUrl, GLIMPSE_URL);
    const response = await fetch(url, {
      headers: { "X-Glimpse-Output": "glance" },
      signal,
    });

    if (!response.ok) {
      throw new ModalError(
        `Failed to fetch modal content: ${response.statusText}`,
        response.status,
      );
    }

    const html = await response.text();
    if (!html) {
      throw new ModalError("Empty response received");
    }

    return html;
  }
}

class ModalState {
  #maxHistory;
  #isLoading;
  #currentRequest;
  #history;
  #subscribers;

  constructor(maxHistory = CONFIG.maxHistory) {
    this.#validateMaxHistory(maxHistory);
    this.#maxHistory = maxHistory;
    this.#isLoading = false;
    this.#currentRequest = null;
    this.#history = [];
    this.#subscribers = new Set();
  }

  #validateMaxHistory(value) {
    if (!Number.isInteger(value) || value < 1) {
      throw new ModalError("maxHistory must be a positive integer");
    }
  }

  #validateHistoryItem(item) {
    if (!item?.content) {
      throw new ModalError("History item must have content URL");
    }
  }

  #notifySubscribers(changeType) {
    this.#subscribers.forEach((callback) =>
      callback({
        type: changeType,
        currentState: this.snapshot(),
      }),
    );
  }

  get isLoading() {
    return this.#isLoading;
  }

  get currentRequest() {
    return this.#currentRequest;
  }

  get historyCurrent() {
    return this.#history[0] || null;
  }

  get historyPrevious() {
    return this.#history[1] || null;
  }

  get historyLast() {
    return this.#history[this.#history.length - 1] || null;
  }

  get canGoBack() {
    return this.#history.length > 1;
  }

  set isLoading(value) {
    const newValue = Boolean(value);
    if (this.#isLoading !== newValue) {
      this.#isLoading = newValue;
      this.#notifySubscribers("loading");
    }
  }

  set currentRequest(controller) {
    if (controller !== null && !(controller instanceof AbortController)) {
      throw new ModalError("Invalid AbortController provided");
    }
    this.#currentRequest = controller;
  }

  addHistory(target, scrollPos = 0) {
    const contentUrl = target?.getAttribute(CONFIG.attributes.modalContent);
    if (!contentUrl) {
      throw new ModalError("Invalid target element");
    }

    const item = {
      title: target.title || "",
      content: contentUrl,
      scrollPos: Math.max(0, Number(scrollPos)),
      timestamp: new Date().toISOString(),
    };

    this.#validateHistoryItem(item);

    if (item.content === this.historyCurrent?.content) {
      return [...this.#history];
    }

    if (this.#history.length > 0) {
      this.#history[0].scrollPos = scrollPos;
    }

    this.#history.unshift(item);
    if (this.#history.length > this.#maxHistory) {
      const homePage = this.historyLast;
      this.#history = [
        ...this.#history.slice(0, this.#maxHistory - 1),
        homePage,
      ];
    }

    this.#notifySubscribers("history");
    return [...this.#history];
  }

  removeCurrent() {
    if (this.#history.length === 0) return null;
    const removed = this.#history.shift();
    this.#notifySubscribers("history");
    return removed;
  }

  clearHistory() {
    if (!this.historyLast) return;

    this.#history = [this.historyLast];
    this.#notifySubscribers("history");
    return [...this.#history];
  }

  reset() {
    this.#currentRequest?.abort();
    this.#isLoading = false;
    this.#currentRequest = null;
    this.#history = [];
    this.#notifySubscribers("reset");
  }

  subscribe(callback) {
    if (typeof callback !== "function") {
      throw new ModalError("Subscriber must be a function");
    }
    this.#subscribers.add(callback);
    return () => this.#subscribers.delete(callback);
  }

  snapshot() {
    return {
      isLoading: this.#isLoading,
      hasActiveRequest: this.#currentRequest !== null,
      history: [...this.#history],
      canGoBack: this.canGoBack,
    };
  }
}

const modalState = new ModalState();

/* Subscribe to state changes
const unsubscribe = modalState.subscribe(({ type, currentState }) => {
    console.log(`State changed: ${type}`, currentState);
});
*/

class ModalError extends Error {
  constructor(message, statusCode = null) {
    super(message);
    this.name = "ModalError";
    this.statusCode = statusCode;
  }
}

class Modal {
  constructor(id) {
    this.element = this.create(id);
    this.#addEventListeners();
  }

  create(id) {
    const modal = document.createElement("dialog");
    modal.id = id;
    modal.className = CONFIG.classes.modal;
    modal.innerHTML = `
            <div class="${CONFIG.classes.content}">${CONFIG.loadingTemplate}</div>
            <div class="${CONFIG.classes.nav}" style="display: none;">
                <button class="${CONFIG.classes.close}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
                <button class="${CONFIG.classes.home}" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                </button>
                <button class="${CONFIG.classes.back}" style="display: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"></path>
                    </svg>
                </button>
            </div>
        `;
    document.body.appendChild(modal);
    return modal;
  }

  #addEventListeners() {
    this.element.addEventListener("click", this.#handleClose.bind(this));
    this.element.addEventListener("keydown", this.#handleClose.bind(this));
    this.element.addEventListener("close", () => this.reset());

    const [homeBtn] = this.element.getElementsByClassName(CONFIG.classes.home);
    homeBtn.addEventListener("click", this.#handleHome);
    const [backBtn] = this.element.getElementsByClassName(CONFIG.classes.back);
    backBtn.addEventListener("click", this.#handleBack);
  }

  #handleClose(event) {
    const { type, target, key } = event;
    if (
      (type === "click" &&
        (target === this.element || target.closest(".modal-close"))) ||
      (type === "keydown" && key === "Escape")
    ) {
      this.element.close();
    }
  }

  #handleHome() {
    if (!modalState.historyLast?.content) return;

    modalState.clearHistory();
    ModalManager.open({
      getAttribute: (attr) => modalState.historyCurrent.content,
      title: modalState.historyCurrent.title,
      classList: {
        contains: (cls) => cls === CONFIG.classes.home,
      },
    });
  }

  #handleBack() {
    if (!modalState.canGoBack) return;

    modalState.removeCurrent();
    ModalManager.open({
      getAttribute: (attr) => modalState.historyCurrent.content,
      title: modalState.historyCurrent.title,
      classList: {
        contains: (cls) => cls === CONFIG.classes.back,
      },
    });
  }

  reset() {
    modalState.currentRequest?.abort();
    modalState.reset();
    this.element.remove();
    document.body.classList.remove("overflow-hidden");
  }
}

class ModalManager {
  static async open(target) {
    const contentUrl = target?.getAttribute(CONFIG.attributes.modalContent);
    if (!contentUrl) {
      throw new ModalError("Content URL is required");
    }

    if (modalState.isLoading) {
      modalState.currentRequest?.abort();
      return;
    }

    const modal = this.#getInstance(CONFIG.id);

    try {
      modalState.isLoading = true;
      this.#showLoading(target);
      modal.setAttribute("aria-busy", "true");

      const controller = new AbortController();
      modalState.currentRequest = controller;

      if (!modal.open) {
        document.body.classList.add("overflow-hidden");
        modal.showModal();
      }

      const html = await Content.fetch(contentUrl, controller.signal);
      this.#updateContent(modal, target, html);
    } catch (error) {
      if (error.name === "AbortError") return;
      console.error("Modal error:", error);
      this.#showError(modal, error.message);
    } finally {
      this.#hideLoading(target);
      this.setupModalTriggers();
      ImageLoader.init();
      const modal = document.getElementById(CONFIG.id);
      if (modal) {
        modal.removeAttribute("aria-busy");
      }
      modalState.isLoading = false;
      modalState.currentRequest = null;
    }
  }

  static #getInstance(id) {
    if (!id || typeof id !== "string") {
      throw new ModalError("Invalid modal ID provided");
    }

    let modal = document.getElementById(id);
    if (!modal) {
      try {
        modal = new Modal(id).element;
      } catch (error) {
        console.error("Error creating modal:", error);
        throw new ModalError("Failed to create modal element");
      }
    }

    if (!(modal instanceof HTMLElement)) {
      throw new ModalError("Invalid modal element");
    }

    return modal;
  }

  static #updateContent(modal, target, html) {
    if (!modal || !target || !html) {
      throw new ModalError("Missing required parameters for updateContent");
    }

    const [modalScroll] = modal.getElementsByClassName(CONFIG.classes.scroll);
    const currentScrollPos = modalScroll?.scrollTop || 0;

    modalState.addHistory(target, currentScrollPos);

    const [contentEl] = modal.getElementsByClassName(CONFIG.classes.content);
    contentEl.innerHTML = html;

    this.#setupModalNav(modal);

    requestAnimationFrame(() => {
      const [scrollEl] = modal.getElementsByClassName(CONFIG.classes.scroll);
      if (scrollEl) {
        const scrollPos =
          target.classList.contains(CONFIG.classes.back) ||
          target.classList.contains(CONFIG.classes.home)
            ? modalState.historyCurrent?.scrollPos || 0
            : 0;

        scrollEl.scrollTop = scrollPos;
      }
    });
  }

  static #setupModalNav(modal) {
    if (!modal) {
      console.error("Invalid parameters for setupModalNav");
      return;
    }

    const [navEl] = modal.getElementsByClassName(CONFIG.classes.nav);
    navEl.style.display = "flex";

    const isHome =
      modalState.historyCurrent?.content === modalState.historyLast?.content;

    const [homeBtn] = navEl.getElementsByClassName(CONFIG.classes.home);
    homeBtn.style.display = isHome ? "none" : "block";

    const [backBtn] = navEl.getElementsByClassName(CONFIG.classes.back);
    if (modalState.canGoBack) {
      backBtn.style.display = "block";
    } else {
      backBtn.style.display = "none";
    }
  }

  static #showLoading(element) {
    if (element.tagName !== "BUTTON") return;
    element.insertAdjacentHTML("beforeend", CONFIG.loadingTemplate);
  }

  static #hideLoading(element) {
    if (element.tagName !== "BUTTON") return;
    const [loadingEl] = element.getElementsByClassName(CONFIG.classes.loading);
    if (loadingEl) loadingEl.remove();
  }

  static #showError(modal, message) {
    const errorHtml = `
            <div class="widget-content ${CONFIG.classes.error}">
                <div class="widget-error-header">
                    <div class="color-negative size-h3">ERROR</div>
                    <svg class="widget-error-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                </div>
                <p class="break-all">${message}</p>
            </div>
        `;
    const [content] = modal.getElementsByClassName(CONFIG.classes.content);
    content.innerHTML = errorHtml;
  }

  static setupModalTriggers() {
    const elements = document.body.querySelectorAll(CONFIG.selectors.modalLoad);
    if (!elements.length) return;

    elements.forEach((el) => {
      if (Utils.isProcessed(el)) return;
      Utils.markAsProcessed(el);

      el.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          ModalManager.open(e.target);
        },
        { passive: false },
      );
    });
  }
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const observer = new MutationObserver((mutations) => {
      const hasTransitioned = mutations.some((mutation) =>
        mutation.target.classList.contains("page-columns-transitioned"),
      );

      if (hasTransitioned) {
        Utils.lightUp();
        Utils.replaceText();
        Utils.dockerLink();
        Utils.setupEksiSearch();
        Utils.setupCopy();
        Utils.setupMpvHandler();
        RelativeTime.setupDynamicRelativeTime();
        Carousel.setupHorizontalScroll();
        CollapsibleGrids.setupCollapsibleGrids();
        ModalManager.setupModalTriggers();
        ImageLoader.init();
        YoutubeProgress.init();
      }
    });

    const toggleObserver = (isVisible) => {
      if (!isVisible) {
        observer.disconnect();
      } else {
        observer.observe(document.body, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    };

    document.addEventListener(
      "visibilitychange",
      () => {
        toggleObserver(!document.hidden);
      },
      { passive: true },
    );

    toggleObserver(true);
  },
  { once: true },
);
