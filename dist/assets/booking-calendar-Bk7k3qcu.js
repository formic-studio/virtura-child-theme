const l="https://calendar.google.com/calendar/appointments/schedules/AcZssZ3J9Lu_9JXgh8buuWMcm6fziY0Oh-tZx6xYMKO2oRM0hINZf70xy599wrP_j97R2WKkf-pGNwh_?gv=true",f="[data-booking-calendar-trigger], .booking-calendar-trigger",m="#brx-content .btn-big",s='a[href], button, [role="button"]',h=/um[oó]w|spotkani|rezerw|kalendarz/i,n="virtura-booking-calendar-dialog";let o,i,c,b,p;const _=()=>(window.location.pathname||"/").toLowerCase().split("/").filter(Boolean).some(t=>["kontakt","contact"].includes(t)),v=()=>{const e=Array.from(document.querySelectorAll(f));if(e.length||!_())return e;const t=Array.from(document.querySelectorAll(m)),a=t.filter(r=>h.test(r.textContent||""));return a.length?a:t.length===1?t:[]},E=e=>e.matches(s)?e:e.querySelector(s)||e,L=(e,t)=>{const a=t.dataset.bookingCalendarUrl||e.dataset.bookingCalendarUrl||l;try{const r=new URL(a,window.location.href);return r.protocol==="https:"&&r.hostname==="calendar.google.com"&&r.pathname.startsWith("/calendar/appointments/schedules/")?r.href:l}catch{return l}},T=(e,t)=>t.dataset.bookingCalendarTitle||e.dataset.bookingCalendarTitle||"Zarezerwuj spotkanie",u=()=>{o?.open&&o.close()},k=()=>o||(o=document.createElement("dialog"),o.id=n,o.className="virtura-booking-dialog",o.setAttribute("aria-labelledby",`${n}-title`),o.innerHTML=`
    <div class="virtura-booking-dialog__surface">
      <header class="virtura-booking-dialog__header">
        <h2 class="virtura-booking-dialog__title" id="${n}-title">
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
  `,i=o.querySelector(".virtura-booking-dialog__frame"),c=o.querySelector(".virtura-booking-dialog__frame-wrapper"),b=o.querySelector(".virtura-booking-dialog__title"),o.querySelector(".virtura-booking-dialog__close")?.addEventListener("click",u),o.addEventListener("click",e=>{e.target===o&&u()}),o.addEventListener("close",()=>{document.body.classList.remove("virtura-booking-dialog-open"),p?.focus({preventScroll:!0})}),i?.addEventListener("load",()=>{c?.classList.add("is-loaded")}),document.body.append(o),o),g=(e,t)=>{const a=k(),r=L(e,t),d=T(e,t);p=t,b.textContent=d,i.src!==r&&(c.classList.remove("is-loaded"),i.src=r),document.body.classList.add("virtura-booking-dialog-open"),typeof a.showModal=="function"?a.showModal():a.setAttribute("open","")},w=e=>{const t=E(e);t.setAttribute("aria-haspopup","dialog"),t.setAttribute("aria-controls",n),t.matches(s)||(t.setAttribute("role","button"),t.tabIndex=0,t.addEventListener("keydown",a=>{["Enter"," "].includes(a.key)&&(a.preventDefault(),g(e,t))})),t.addEventListener("click",a=>{a.preventDefault(),g(e,t)})},y=()=>{const e=v();e.length&&(k(),e.forEach(w))};export{y as initBookingCalendar};
