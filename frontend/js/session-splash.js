(function () {
  "use strict";

  const SPLASH_IMAGE_URL = "https://3z8qdlgzk1.ufs.sh/f/ryTwMvEKto8yWUEcNazPVjgpf1LJ95aFliKEU3kwNuBomy2G";
  const HOLD_DURATION = 2600;
  const EXIT_DURATION = 650;

  class SessionSplash {
    constructor({ imageUrl, holdDuration, exitDuration }) {
      this.imageUrl = imageUrl;
      this.holdDuration = holdDuration;
      this.exitDuration = exitDuration;
      this.splash = null;
      this.main = document.querySelector("main");
    }

    start() {
      this.preloadImage()
        .then(() => this.show())
        .catch(() => this.finish(false));
    }

    preloadImage() {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = resolve;
        image.onerror = reject;
        image.src = this.imageUrl;

        if (image.decode) {
          image.decode().then(resolve).catch(() => {});
        }
      });
    }

    show() {
      this.lockPage();
      this.splash = this.createSplash();
      document.body.prepend(this.splash);
      this.main?.classList.add("homepage-reveal-pending");

      window.requestAnimationFrame(() => {
        this.splash?.classList.add("is-visible");
      });

      window.setTimeout(() => this.hide(), this.holdDuration);
    }

    hide() {
      if (!this.splash) {
        this.finish(true);
        return;
      }

      this.splash.classList.add("is-leaving");
      this.main?.classList.remove("homepage-reveal-pending");
      this.main?.classList.add("homepage-reveal-ready");

      window.setTimeout(() => this.finish(true), this.exitDuration);
    }

    finish(wasShown) {
      document.documentElement.classList.remove("session-splash-pending");
      document.body.classList.remove("splash-lock");
      this.splash?.remove();
      this.splash = null;

      if (wasShown) {
        window.setTimeout(() => this.main?.classList.remove("homepage-reveal-ready"), 700);
      } else {
        this.main?.classList.remove("homepage-reveal-pending", "homepage-reveal-ready");
      }
    }

    lockPage() {
      document.body.classList.add("splash-lock");
    }

    createSplash() {
      const splash = document.createElement("div");
      splash.className = "session-splash";
      splash.setAttribute("aria-hidden", "true");

      const image = document.createElement("img");
      image.className = "session-splash-image";
      image.src = this.imageUrl;
      image.alt = "";
      image.decoding = "async";
      image.fetchPriority = "high";

      splash.append(image);
      return splash;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    new SessionSplash({
      imageUrl: SPLASH_IMAGE_URL,
      holdDuration: HOLD_DURATION,
      exitDuration: EXIT_DURATION
    }).start();
  });
})();
