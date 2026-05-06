// service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}

// items dialogues
function itemsOptions(createLink, manageLink, item) {
    Swal.fire({
        title: `${item} Editor`,
        html: `<p>Create or manage ${item.toLowerCase()}.</p>`,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonColor: 'blue',
        cancelButtonColor: 'grey',
        denyButtonColor: 'blue',
        confirmButtonText: 'Create',
        cancelButtonText: 'Cancel',
        denyButtonText: 'Manage',
        reverseButtons: false
    }).then((result) => {
        if (result.isConfirmed) {
            const width = 600;
            const height = 700;
            const left = (screen.width / 2) - (width / 2);
            const top = (screen.height / 2) - (height / 2);

            // Unique per item (Events / Tasks / Reminders)
            const windowName = `Create_${String(item).replace(/\s+/g, '_')}`;

            window.open(
                createLink,
                windowName,
                'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + ',resizable=yes,scrollbar=yes'
            );
        } else if (result.isDenied) {
            window.location.href = manageLink;
        } else if (result.isDismissed) {
            console.log("The user cancelled the action");
        }
    });
}

// today's date
const dateElement = document.getElementById('current-date');
if (dateElement) {
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateElement.textContent = today.toLocaleDateString('en-US', options);
}

// create form swap
function formSwap(eventType, typesContainerId = 'eventTypes', formAreaId = 'area-form') {
  document.getElementById(typesContainerId).style.display = 'none';
  const formArea = document.getElementById(formAreaId);
  formArea.style.display = 'block';
  formArea.querySelectorAll('.dynamic-form').forEach(f => f.style.display = 'none');
  document.getElementById('form-' + eventType.toLowerCase()).style.display = 'block';
}
function returnType(typesContainerId = 'eventTypes', formAreaId = 'area-form') {
  document.getElementById(formAreaId).style.display = 'none';
  document.getElementById(typesContainerId).style.display = 'flex';
}

// reveal a hidden element when a button is clicked;
// only one target per group is shown at a time
const _revealOnClickRegistry = [];
function revealOnClick(buttonId, targetId) {
  const button = document.getElementById(buttonId);
  const target = document.getElementById(targetId);
  button.setAttribute('aria-expanded', 'false');
  _revealOnClickRegistry.push({ button, target });
  button.addEventListener('click', () => {
    const isOpen = !target.classList.contains('hidden');
    _revealOnClickRegistry.forEach(entry => {
      entry.target.classList.add('hidden');
      entry.button.setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      target.classList.remove('hidden');
      button.setAttribute('aria-expanded', 'true');
    }
  });
}

// ── Event Storage Framework ──────────────────────────────────────────────────

const EVENTS_STORAGE_KEY = 'timescapeEvents';

/** Generate a unique event ID */
function generateEventId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/** Retrieve all saved events from localStorage */
function loadEventsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/** Append an event object to localStorage */
function saveEventToStorage(eventObj) {
  const events = loadEventsFromStorage();
  events.push(eventObj);
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

/**
 * Find the currently active subtype detail div inside a form.
 * An active div is one whose id ends in "Details" and lacks the "hidden" class.
 * Returns the element or null.
 */
function getActiveSubtypeDetail(formEl) {
  const detailDivs = formEl.querySelectorAll('div[id$="Details"]');
  for (const div of detailDivs) {
    if (!div.classList.contains('hidden')) {
      return div;
    }
  }
  return null;
}

/**
 * Extract the outerHTML of the first <svg> inside an element, or '' if none.
 */
function extractIcon(containerEl) {
  if (!containerEl) return '';
  const svg = containerEl.querySelector('svg');
  return svg ? svg.outerHTML : '';
}

/**
 * Collect all named inputs, selects, and textareas within an element.
 * Returns a plain object { fieldName: value }.
 */
function collectInputValues(containerEl) {
  const data = {};
  containerEl.querySelectorAll('input[name], select[name], textarea[name]').forEach(el => {
    if (el.type === 'radio') {
      if (el.checked) data[el.name] = el.value;
    } else {
      data[el.name] = el.value;
    }
  });
  return data;
}

// Subtype label maps (detail div id → human-readable name)
const SUBTYPE_LABELS = {
  medicalDetails: 'Medical',
  interviewDetails: 'Interview',
  psychologicalDetails: 'Psychological',
  personalCareDetails: 'Personal Care',
  personalServiceDetails: 'Personal Service',
  professionalServiceDetails: 'Professional Service',
  communityEventDetails: 'Community',
  professionalEventDetails: 'Professional',
  socialEventDetails: 'Social',
  readingFocusDetails: 'Reading',
  writingFocusDetails: 'Writing',
  projectFocusDetails: 'Project',
  fitnessFocusDetails: 'Fitness',
  personalMeetingDetails: 'Personal',
  professionalMeetingDetails: 'Professional',
};

function buildAppointmentEvent() {
  const form = document.getElementById('form-appointment');
  const activeDetail = getActiveSubtypeDetail(form);
  return {
    id: generateEventId(),
    eventCategory: 'appointment',
    eventType: activeDetail ? (SUBTYPE_LABELS[activeDetail.id] || null) : null,
    icon: extractIcon(activeDetail),
    title: document.getElementById('appointmentTitle').value.trim(),
    date: document.getElementById('appointmentDate').value,
    startTime: document.getElementById('appointmentStartTime').value,
    endTime: document.getElementById('appointmentEndTime').value,
    location: document.getElementById('appointmentLocation').value.trim(),
    repeat: form.querySelector('select.type') ? form.querySelector('select.type').value : '',
    domain: form.querySelector('[name="domainSelect"]') ? form.querySelector('[name="domainSelect"]').value : '',
    bucket: form.querySelector('[name="bucketSelect"]') ? form.querySelector('[name="bucketSelect"]').value : '',
    additionalDetails: form.querySelector('textarea[name="appointmentAdditionalDetails"]').value.trim(),
    typeDetails: activeDetail ? collectInputValues(activeDetail) : {},
    createdAt: new Date().toISOString(),
  };
}

function buildEventEvent() {
  const form = document.getElementById('form-event');
  const activeDetail = getActiveSubtypeDetail(form);
  return {
    id: generateEventId(),
    eventCategory: 'event',
    eventType: activeDetail ? (SUBTYPE_LABELS[activeDetail.id] || null) : null,
    icon: extractIcon(activeDetail),
    title: document.getElementById('eventTitle').value.trim(),
    date: document.getElementById('eventDate').value,
    startTime: document.getElementById('eventStartTime').value,
    endTime: document.getElementById('eventEndTime').value,
    location: document.getElementById('eventLocation').value.trim(),
    repeat: form.querySelector('select.type') ? form.querySelector('select.type').value : '',
    domain: '',
    bucket: '',
    additionalDetails: form.querySelector('textarea[name="eventAdditionalDetails"]').value.trim(),
    typeDetails: activeDetail ? collectInputValues(activeDetail) : {},
    createdAt: new Date().toISOString(),
  };
}

function buildFocusEvent() {
  const form = document.getElementById('form-focus');
  const activeDetail = getActiveSubtypeDetail(form);
  return {
    id: generateEventId(),
    eventCategory: 'focus',
    eventType: activeDetail ? (SUBTYPE_LABELS[activeDetail.id] || null) : null,
    icon: extractIcon(activeDetail),
    title: document.getElementById('focusTitle').value.trim(),
    date: document.getElementById('focusDate').value,
    startTime: document.getElementById('focusStartTime').value,
    endTime: document.getElementById('focusEndTime').value,
    location: document.getElementById('focusLocation').value.trim(),
    repeat: form.querySelector('select.type') ? form.querySelector('select.type').value : '',
    domain: '',
    bucket: '',
    additionalDetails: form.querySelector('textarea[name="focusAdditionalDetails"]').value.trim(),
    typeDetails: activeDetail ? collectInputValues(activeDetail) : {},
    createdAt: new Date().toISOString(),
  };
}

function buildJobEvent() {
  const form = document.getElementById('form-job');
  return {
    id: generateEventId(),
    eventCategory: 'job',
    eventType: null,
    icon: '',
    title: document.getElementById('jobTitle').value.trim(),
    date: document.getElementById('jobDate').value,
    startTime: document.getElementById('jobStartTime').value,
    endTime: document.getElementById('jobEndTime').value,
    location: document.getElementById('jobLocation').value.trim(),
    repeat: form.querySelector('select.type') ? form.querySelector('select.type').value : '',
    domain: '',
    bucket: '',
    additionalDetails: form.querySelector('textarea[name="jobAdditionalDetails"]').value.trim(),
    typeDetails: {},
    createdAt: new Date().toISOString(),
  };
}

function buildMeetingEvent() {
  const form = document.getElementById('form-meeting');
  const activeDetail = getActiveSubtypeDetail(form);
  return {
    id: generateEventId(),
    eventCategory: 'meeting',
    eventType: activeDetail ? (SUBTYPE_LABELS[activeDetail.id] || null) : null,
    icon: extractIcon(activeDetail),
    title: document.getElementById('meetingTitle').value.trim(),
    date: document.getElementById('meetingDate').value,
    startTime: document.getElementById('meetingStartTime').value,
    endTime: document.getElementById('meetingEndTime').value,
    location: document.getElementById('meetingLocation').value.trim(),
    repeat: form.querySelector('select.type') ? form.querySelector('select.type').value : '',
    domain: form.querySelector('[name="domainSelect"]') ? form.querySelector('[name="domainSelect"]').value : '',
    bucket: form.querySelector('[name="bucketSelect"]') ? form.querySelector('[name="bucketSelect"]').value : '',
    additionalDetails: form.querySelector('textarea[name="meetingAdditionalDetails"]').value.trim(),
    typeDetails: activeDetail ? collectInputValues(activeDetail) : {},
    createdAt: new Date().toISOString(),
  };
}

/**
 * Wire each Save button on createEvent.html to its builder and storage call.
 * Call this once at the bottom of createEvent.html.
 */
function attachEventSaveHandlers() {
  const saveMap = {
    saveAppointment: buildAppointmentEvent,
    saveEvent:       buildEventEvent,
    saveFocus:       buildFocusEvent,
    saveJob:         buildJobEvent,
    saveMeeting:     buildMeetingEvent,
  };

  Object.entries(saveMap).forEach(([btnId, buildFn]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const eventObj = buildFn();
      saveEventToStorage(eventObj);
      console.log('Event saved:', eventObj);
    });
  });
}
