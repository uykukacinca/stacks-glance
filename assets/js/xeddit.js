function handlePlay(e) {
  const btn = e.target;
  const hlsUrl = btn.getAttribute("data-hls-url");
  const video = btn.nextElementSibling;

  // When the video starts playing, add the class
  video.onplaying = () => {
    video.classList.add("is-playing");
  };

  // When the video is paused, remove the class to dim it again
  video.onpause = () => {
    video.classList.remove("is-playing");
  };

  video.onerror = (err) => {
    console.error("Playback failed:", err);
  };

  if (Hls.isSupported()) {
    const hls = new Hls({
      abrStartBitrate: Infinity,
      // Optional: Add a cap to prevent massive data usage on mobile
      capLevelToPlayerSize: true,
    });

    hls.loadSource(hlsUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      video.removeAttribute("hidden");
      btn.remove();
      // Force the current level to the highest index
      // hls.levels is sorted by bitrate; last index is usually highest
      hls.currentLevel = hls.levels.length - 1;
      video.play();
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    // Native HLS support for Safari (Mac/iOS)
    video.src = hlsUrl;
    video.removeAttribute("hidden");
    btn.remove();
    video.play();
  }
}

function setupHLS() {
  const elements = document.querySelectorAll(".x-fn-hls");
  if (!elements.length) return;

  elements.forEach((el) => {
    el.addEventListener("click", handlePlay);
  });
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const observer = new MutationObserver((mutations) => {
      const hasTransitioned = mutations.some((mutation) =>
        mutation.target.classList.contains("page-columns-transitioned"),
      );

      if (hasTransitioned) {
        setupHLS();
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
