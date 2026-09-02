const DEFAULT_BOOKING_URL =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1m4dzOi1CydW-8YJNPmqf1QpU89tasfXWppfhibAF-MXbvZWaKY-fQ743JqP7-KfjcKxFyJWsK?gv=true';
const EXPLICIT_TRIGGER_SELECTOR =
  '[data-booking-calendar-trigger], .booking-calendar-trigger';
const FALLBACK_TRIGGER_SELECTOR = '#brx-content .btn-big';
const INTERACTIVE_SELECTOR = 'a[href], button, [role="button"]';
const BOOKING_TEXT_PATTERN = /um[oó]w|spotkani|rezerw|kalendarz/i;
const DIALOG_ID = 'virtura-booking-calendar-dialog';

let dialog;
let dialogFrame;
let dialogFrameWrapper;
let dialogTitle;
let lastTrigger;

const isContactPage = () => {
  const pathSegments = (window.location.pathname || '/')
    .toLowerCase()
    .split('/')
    .filter(Boolean);

  return pathSegments.some((segment) =>
    ['kontakt', 'contact'].includes(segment),
  );
};

const getTriggerElements = () => {
  const explicitTriggers = Array.from(
    document.querySelectorAll(EXPLICIT_TRIGGER_SELECTOR),
  );

  if (explicitTriggers.length || !isContactPage()) {
    return explicitTriggers;
  }

  const contactButtons = Array.from(
    document.querySelectorAll(FALLBACK_TRIGGER_SELECTOR),
  );
  const matchingButtons = contactButtons.filter((button) =>
    BOOKING_TEXT_PATTERN.test(button.textContent || ''),
  );

  if (matchingButtons.length) {
    return matchingButtons;
  }

  return contactButtons.length === 1 ? contactButtons : [];
};

const getInteractiveElement = (trigger) => {
  if (trigger.matches(INTERACTIVE_SELECTOR)) {
    return trigger;
  }

  return trigger.querySelector(INTERACTIVE_SELECTOR) || trigger;
};

const getCalendarUrl = (trigger, interactiveElement) => {
  const configuredUrl =
    interactiveElement.dataset.bookingCalendarUrl ||
    trigger.dataset.bookingCalendarUrl ||
    DEFAULT_BOOKING_URL;

  try {
    const url = new URL(configuredUrl, window.location.href);
    const isGoogleCalendar =
      url.protocol === 'https:' &&
      url.hostname === 'calendar.google.com' &&
      url.pathname.startsWith('/calendar/appointments/schedules/');

    return isGoogleCalendar ? url.href : DEFAULT_BOOKING_URL;
  } catch {
    return DEFAULT_BOOKING_URL;
  }
};

const getCalendarTitle = (trigger, interactiveElement) =>
  interactiveElement.dataset.bookingCalendarTitle ||
  trigger.dataset.bookingCalendarTitle ||
  'Zarezerwuj spotkanie';

const closeDialog = () => {
  if (!dialog?.open) {
    return;
  }

  dialog.close();
};

const createDialog = () => {
  if (dialog) {
    return dialog;
  }

  dialog = document.createElement('dialog');
  dialog.id = DIALOG_ID;
  dialog.className = 'virtura-booking-dialog';
  dialog.setAttribute('aria-labelledby', `${DIALOG_ID}-title`);
  dialog.innerHTML = `
    <div class="virtura-booking-dialog__surface">
      <header class="virtura-booking-dialog__header">
        <h2 class="virtura-booking-dialog__title" id="${DIALOG_ID}-title">
          Zarezerwuj spotkanie
        </h2>
        <button
          class="virtura-booking-dialog__close"
          type="button"
          aria-label="Zamknij okno rezerwacji"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>
      </header>
      <div class="virtura-booking-dialog__frame-wrapper">
        <p class="virtura-booking-dialog__loading" role="status">
          Ładowanie kalendarza…
        </p>
        <iframe
          class="virtura-booking-dialog__frame"
          title="Kalendarz rezerwacji spotkania"
          frameborder="0"
        ></iframe>
      </div>
    </div>
  `;

  dialogFrame = dialog.querySelector('.virtura-booking-dialog__frame');
  dialogFrameWrapper = dialog.querySelector(
    '.virtura-booking-dialog__frame-wrapper',
  );
  dialogTitle = dialog.querySelector('.virtura-booking-dialog__title');

  dialog
    .querySelector('.virtura-booking-dialog__close')
    ?.addEventListener('click', closeDialog);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      closeDialog();
    }
  });

  dialog.addEventListener('close', () => {
    document.body.classList.remove('virtura-booking-dialog-open');
    lastTrigger?.focus({ preventScroll: true });
  });

  dialogFrame?.addEventListener('load', () => {
    dialogFrameWrapper?.classList.add('is-loaded');
  });

  document.body.append(dialog);

  return dialog;
};

const openDialog = (trigger, interactiveElement) => {
  const bookingDialog = createDialog();
  const calendarUrl = getCalendarUrl(trigger, interactiveElement);
  const calendarTitle = getCalendarTitle(trigger, interactiveElement);

  lastTrigger = interactiveElement;
  dialogTitle.textContent = calendarTitle;

  if (dialogFrame.src !== calendarUrl) {
    dialogFrameWrapper.classList.remove('is-loaded');
    dialogFrame.src = calendarUrl;
  }

  document.body.classList.add('virtura-booking-dialog-open');

  if (typeof bookingDialog.showModal === 'function') {
    bookingDialog.showModal();
  } else {
    bookingDialog.setAttribute('open', '');
  }
};

const setupTrigger = (trigger) => {
  const interactiveElement = getInteractiveElement(trigger);

  interactiveElement.setAttribute('aria-haspopup', 'dialog');
  interactiveElement.setAttribute('aria-controls', DIALOG_ID);

  if (!interactiveElement.matches(INTERACTIVE_SELECTOR)) {
    interactiveElement.setAttribute('role', 'button');
    interactiveElement.tabIndex = 0;
    interactiveElement.addEventListener('keydown', (event) => {
      if (!['Enter', ' '].includes(event.key)) {
        return;
      }

      event.preventDefault();
      openDialog(trigger, interactiveElement);
    });
  }

  interactiveElement.addEventListener('click', (event) => {
    event.preventDefault();
    openDialog(trigger, interactiveElement);
  });
};

export const initBookingCalendar = () => {
  const triggers = getTriggerElements();

  if (!triggers.length) {
    return;
  }

  createDialog();
  triggers.forEach(setupTrigger);
};
