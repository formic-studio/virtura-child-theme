import { loadGsap } from "./motion.js";

const SLIDER_SELECTOR = ".about-slider";
const IMAGE_SELECTOR = ".slider-img-item";
const TEXT_SELECTOR = ".slider-text-block";
const CONTROLS_SELECTOR = ".slider-paggination .svg-arrow-block";
const ACTIVE_CLASS = "is-active";
const DISABLED_CLASS = "is-disabled";
const READY_CLASS = "virtura-about-slider-ready";
const GSAP_CLASS = "virtura-about-slider-gsap";
const PREV_LABEL = "Poprzedni slajd";
const NEXT_LABEL = "Następny slajd";
const ANIMATION_DURATION = 0.92;
const ANIMATION_EASE = "power3.out";
const IMAGE_REVEAL_DURATION = 0.96;
const IMAGE_REVEAL_EASE = "power4.out";
const IMAGE_NEXT_HIDDEN_CLIP = "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)";
const IMAGE_PREV_HIDDEN_CLIP =
  "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)";
const IMAGE_REVEAL_VISIBLE_CLIP =
  "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
const IMAGE_ENTER_SCALE = 1.025;
const IMAGE_ENTER_OFFSET = "1.2rem";
const IMAGE_OUTGOING_SCALE = 0.985;
const TEXT_WORD_DELAY = 0.38;
const TEXT_WORD_DURATION = 0.6;
const TEXT_WORD_EASE = "sine.out";
const TEXT_WORD_STAGGER = 0.035;
const TEXT_FADE_OUT_DURATION = 0.22;
const SWIPE_THRESHOLD = 40;

const reducedMotionMedia = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);
const textSplitInstances = new WeakMap();
const textTransitionTokens = new WeakMap();

let sliderAnimationPromise;
let fontsReadyPromise;

const waitForFonts = () => {
  if (!fontsReadyPromise) {
    fontsReadyPromise =
      document.fonts?.ready?.catch(() => {}) || Promise.resolve();
  }

  return fontsReadyPromise;
};

const loadSliderAnimation = async () => {
  if (!sliderAnimationPromise) {
    sliderAnimationPromise = Promise.all([
      loadGsap(),
      import("gsap/SplitText"),
      waitForFonts(),
    ]).then(([{ gsap }, splitTextModule]) => {
      const SplitText = splitTextModule.SplitText || splitTextModule.default;

      gsap.registerPlugin(SplitText);

      return { gsap, SplitText };
    });
  }

  return sliderAnimationPromise;
};

const clampIndex = (index, length) => Math.min(Math.max(index, 0), length - 1);

const revertTextSplit = (item) => {
  const split = textSplitInstances.get(item);

  if (!split) {
    return;
  }

  split.revert();
  textSplitInstances.delete(item);
};

const splitTextWords = (SplitText, item) => {
  revertTextSplit(item);

  const split = SplitText.create(item, {
    aria: "auto",
    type: "words",
    wordsClass: "virtura-slider-word",
  });

  textSplitInstances.set(item, split);

  return split;
};

const getImageHiddenClip = (direction) =>
  direction < 0 ? IMAGE_PREV_HIDDEN_CLIP : IMAGE_NEXT_HIDDEN_CLIP;

const getImageEnterX = (direction) =>
  direction < 0 ? IMAGE_ENTER_OFFSET : `-${IMAGE_ENTER_OFFSET}`;

const setClipPath = (item, clipPath) => {
  item.style.clipPath = clipPath;
  item.style.webkitClipPath = clipPath;
};

const setActiveState = (items, index) => {
  items.forEach((item, itemIndex) => {
    const isActive = itemIndex === index;

    item.classList.toggle(ACTIVE_CLASS, isActive);
    item.setAttribute("aria-hidden", String(!isActive));
  });
};

const setImageState = (
  items,
  index,
  previousIndex,
  { animate = true } = {},
) => {
  const incoming = items[index];
  const outgoing = items[previousIndex];
  const direction = index < previousIndex ? -1 : 1;
  const hiddenClip = getImageHiddenClip(direction);
  const enterX = getImageEnterX(direction);

  if (!animate || reducedMotionMedia.matches) {
    items.forEach((item, itemIndex) => {
      const isActive = itemIndex === index;

      setClipPath(item, IMAGE_REVEAL_VISIBLE_CLIP);
      item.style.filter = "none";
      item.style.opacity = isActive ? "1" : "0";
      item.style.transform = "translate3d(0, 0, 0)";
      item.style.zIndex = isActive ? "2" : "1";
    });

    setActiveState(items, index);

    return;
  }

  items.forEach((item, itemIndex) => {
    const isOutgoing = itemIndex === previousIndex;

    setClipPath(item, IMAGE_REVEAL_VISIBLE_CLIP);
    item.style.filter = "none";
    item.style.opacity = isOutgoing ? "1" : "0";
    item.style.transform = "translate3d(0, 0, 0)";
    item.style.zIndex = isOutgoing ? "2" : "1";
  });

  if (incoming) {
    setClipPath(incoming, hiddenClip);
    incoming.style.filter = "brightness(1.06)";
    incoming.style.opacity = "1";
    incoming.style.transform = `translate3d(${enterX}, 0, 0) scale(${IMAGE_ENTER_SCALE})`;
    incoming.style.zIndex = "3";
  }

  setActiveState(items, index);

  void loadGsap()
    .then(({ gsap }) => {
      const slider = items[0]?.closest(SLIDER_SELECTOR);

      slider?.classList.add(GSAP_CLASS);
      gsap.killTweensOf(items);
      gsap.set(items, {
        clipPath: IMAGE_REVEAL_VISIBLE_CLIP,
        filter: "none",
        opacity: 0,
        scale: 1,
        transformOrigin: "center center",
        webkitClipPath: IMAGE_REVEAL_VISIBLE_CLIP,
        x: 0,
        xPercent: 0,
        zIndex: 1,
      });

      if (outgoing && outgoing !== incoming) {
        gsap.set(outgoing, {
          opacity: 1,
          zIndex: 2,
        });
      }

      if (incoming) {
        gsap.set(incoming, {
          clipPath: hiddenClip,
          filter: "brightness(1.06)",
          opacity: 1,
          scale: IMAGE_ENTER_SCALE,
          webkitClipPath: hiddenClip,
          x: enterX,
          zIndex: 3,
        });
      }

      const timeline = gsap.timeline({
        onComplete: () => {
          if (outgoing && outgoing !== incoming) {
            gsap.set(outgoing, {
              filter: "none",
              opacity: 0,
              scale: 1,
              x: 0,
              zIndex: 1,
            });
          }

          if (incoming) {
            gsap.set(incoming, {
              clipPath: IMAGE_REVEAL_VISIBLE_CLIP,
              filter: "none",
              opacity: 1,
              scale: 1,
              webkitClipPath: IMAGE_REVEAL_VISIBLE_CLIP,
              x: 0,
              zIndex: 2,
            });
          }
        },
      });

      if (outgoing && outgoing !== incoming) {
        timeline.to(
          outgoing,
          {
            duration: 0.68,
            ease: "power2.out",
            filter: "brightness(0.92)",
            scale: IMAGE_OUTGOING_SCALE,
          },
          0,
        );
      }

      if (incoming) {
        timeline.fromTo(
          incoming,
          {
            clipPath: hiddenClip,
            filter: "brightness(1.06)",
            scale: IMAGE_ENTER_SCALE,
            webkitClipPath: hiddenClip,
            x: enterX,
          },
          {
            clipPath: IMAGE_REVEAL_VISIBLE_CLIP,
            duration: IMAGE_REVEAL_DURATION,
            ease: IMAGE_REVEAL_EASE,
            filter: "brightness(1)",
            scale: 1,
            webkitClipPath: IMAGE_REVEAL_VISIBLE_CLIP,
            x: 0,
          },
          0,
        );
      }
    })
    .catch(() => {
      items.forEach((item, itemIndex) => {
        const isActive = itemIndex === index;

        setClipPath(item, IMAGE_REVEAL_VISIBLE_CLIP);
        item.style.filter = "none";
        item.style.opacity = isActive ? "1" : "0";
        item.style.transform = "translate3d(0, 0, 0)";
        item.style.zIndex = isActive ? "2" : "1";
      });

      setActiveState(items, index);
    });
};

const setTextState = (items, index, previousIndex, { animate = true } = {}) => {
  const xPercent = index * -100;
  const slider = items[0]?.closest(SLIDER_SELECTOR);
  const transitionToken = {};

  setActiveState(items, index);
  slider && textTransitionTokens.set(slider, transitionToken);

  if (!animate || reducedMotionMedia.matches) {
    items.forEach((item, itemIndex) => {
      revertTextSplit(item);
      item.style.opacity = itemIndex === index ? "1" : "0";
      item.style.transform = `translate3d(${xPercent}%, 0, 0)`;
    });

    return;
  }

  items.forEach((item, itemIndex) => {
    if (itemIndex !== previousIndex || itemIndex === index) {
      item.style.opacity = "0";
    }
  });

  void loadSliderAnimation()
    .then(({ gsap, SplitText }) => {
      if (slider && textTransitionTokens.get(slider) !== transitionToken) {
        return;
      }

      const incoming = items[index];
      const outgoing = items[previousIndex];

      slider?.classList.add(GSAP_CLASS);
      gsap.killTweensOf(items);

      gsap.to(items, {
        duration: ANIMATION_DURATION,
        ease: ANIMATION_EASE,
        force3D: true,
        overwrite: "auto",
        xPercent,
      });

      if (outgoing && outgoing !== incoming) {
        gsap.to(outgoing, {
          duration: TEXT_FADE_OUT_DURATION,
          ease: "power1.out",
          opacity: 0,
          overwrite: "auto",
        });
      }

      if (incoming) {
        const split = splitTextWords(SplitText, incoming);

        gsap.set(incoming, { opacity: 1 });
        gsap.set(split.words, { opacity: 0 });
        gsap.to(split.words, {
          delay: TEXT_WORD_DELAY,
          duration: TEXT_WORD_DURATION,
          ease: TEXT_WORD_EASE,
          opacity: 1,
          overwrite: "auto",
          stagger: TEXT_WORD_STAGGER,
        });
      }
    })
    .catch(() => {
      items.forEach((item, itemIndex) => {
        revertTextSplit(item);
        item.style.opacity = itemIndex === index ? "1" : "0";
        item.style.transform = `translate3d(${xPercent}%, 0, 0)`;
      });
    });
};

const setControlState = (control, isDisabled) => {
  control.classList.toggle(DISABLED_CLASS, isDisabled);
  control.setAttribute("aria-disabled", String(isDisabled));
  control.setAttribute("tabindex", isDisabled ? "-1" : "0");
};

const setupControl = (control, label, onClick) => {
  control.setAttribute("aria-label", label);
  control.setAttribute("role", "button");
  control.setAttribute("tabindex", "0");

  control.addEventListener("click", onClick);
  control.addEventListener("keydown", (event) => {
    if (control.getAttribute("aria-disabled") === "true") {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onClick();
  });
};

const updateControls = (controls, activeIndex, slideCount) => {
  setControlState(controls[0], activeIndex === 0);
  setControlState(controls[1], activeIndex === slideCount - 1);
};

const initSlider = (slider) => {
  if (slider.classList.contains(READY_CLASS)) {
    return;
  }

  const images = Array.from(slider.querySelectorAll(IMAGE_SELECTOR));
  const textBlocks = Array.from(slider.querySelectorAll(TEXT_SELECTOR));
  const controls = Array.from(slider.querySelectorAll(CONTROLS_SELECTOR));
  const slideCount = Math.min(images.length, textBlocks.length);

  if (slideCount < 2 || controls.length < 2) {
    return;
  }

  const imageSlides = images.slice(0, slideCount);
  const textSlides = textBlocks.slice(0, slideCount);
  let activeIndex = 0;
  let touchStartX = null;

  const goTo = (nextIndex, options) => {
    const clampedIndex = clampIndex(nextIndex, slideCount);
    const previousIndex = activeIndex;

    if (clampedIndex === activeIndex && options?.force !== true) {
      return;
    }

    activeIndex = clampedIndex;
    setImageState(imageSlides, activeIndex, previousIndex, options);
    setTextState(textSlides, activeIndex, previousIndex, options);
    updateControls(controls, activeIndex, slideCount);
    slider.dataset.activeSlide = String(activeIndex + 1);
  };

  setupControl(controls[0], PREV_LABEL, () => {
    if (activeIndex > 0) {
      goTo(activeIndex - 1);
    }
  });

  setupControl(controls[1], NEXT_LABEL, () => {
    if (activeIndex < slideCount - 1) {
      goTo(activeIndex + 1);
    }
  });

  slider.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.touches[0]?.clientX ?? null;
    },
    { passive: true },
  );

  slider.addEventListener(
    "touchend",
    (event) => {
      if (touchStartX === null) {
        return;
      }

      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const distance = touchEndX - touchStartX;

      touchStartX = null;

      if (Math.abs(distance) < SWIPE_THRESHOLD) {
        return;
      }

      goTo(distance < 0 ? activeIndex + 1 : activeIndex - 1);
    },
    { passive: true },
  );

  slider.classList.add(READY_CLASS);
  slider.setAttribute("aria-roledescription", "carousel");
  goTo(0, { animate: false, force: true });
};

export const initAboutSlider = () => {
  document.querySelectorAll(SLIDER_SELECTOR).forEach(initSlider);
};
