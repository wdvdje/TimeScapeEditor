// service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}

// items dialogues
function getSwalThemeOptions() {
  return {
    icon: 'question',
    confirmButtonColor: 'blue',
    cancelButtonColor: 'grey',
    denyButtonColor: 'blue',
    customClass: {
      popup: 'timescape-swal-popup',
      title: 'timescape-swal-title',
      htmlContainer: 'timescape-swal-content',
    },
  };
}

function itemsOptions(createLink, manageLink, item) {
    Swal.fire({
        ...getSwalThemeOptions(),
        title: `${item} Editor`,
        html: `<p>Create or manage ${item.toLowerCase()}.</p>`,
        showDenyButton: true,
        showCancelButton: true,
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
const MAX_RECURRING_OCCURRENCES = 12;

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

/** Find a single stored event by its ID */
function loadEventById(id) {
  return loadEventsFromStorage().find((e) => e.id === id) || null;
}

/** Replace a stored event in-place, matched by id */
function updateEventInStorage(updatedEvent) {
  const events = loadEventsFromStorage().map((e) => e.id === updatedEvent.id ? updatedEvent : e);
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

/** Delete a stored event by id */
function deleteEventById(id) {
  const events = loadEventsFromStorage().filter((e) => e.id !== id);
  localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

/** Add an excluded date to a recurring event (single-occurrence delete) */
function excludeRecurringDate(eventId, dateStr) {
  const original = loadEventById(eventId);
  if (!original || !dateStr) return;
  const excluded = [...(original.excludedDates || [])];
  if (!excluded.includes(dateStr)) excluded.push(dateStr);
  updateEventInStorage({ ...original, excludedDates: excluded });
}

function getRepeatSelect(formEl) {
  if (!formEl) return null;
  return formEl.querySelector('[data-role="repeat-select"]') || formEl.querySelector('select.type');
}

function getRepeatUntilInput(formEl) {
  if (!formEl) return null;
  return formEl.querySelector('[data-role="repeat-until"]');
}

function getPrimaryDateInput(formEl) {
  if (!formEl) return null;
  return formEl.querySelector('input[type="date"]:not([data-role="repeat-until"])');
}

function getRepeatSettings(formEl) {
  const repeatSelect = getRepeatSelect(formEl);
  const repeatUntilInput = getRepeatUntilInput(formEl);
  return {
    repeat: repeatSelect ? repeatSelect.value : '',
    repeatUntil: repeatUntilInput ? repeatUntilInput.value : '',
  };
}

function syncRepeatUntilBounds(formEl) {
  const repeatUntilInput = getRepeatUntilInput(formEl);
  const primaryDateInput = getPrimaryDateInput(formEl);
  if (!repeatUntilInput || !primaryDateInput) return;

  const minDate = primaryDateInput.value || '';
  repeatUntilInput.min = minDate;
  if (minDate && repeatUntilInput.value && repeatUntilInput.value < minDate) {
    repeatUntilInput.value = minDate;
  }
}

function updateRepeatUntilVisibility(formEl) {
  if (!formEl) return;

  const repeatSelect = getRepeatSelect(formEl);
  const repeatUntilInput = getRepeatUntilInput(formEl);
  const repeatUntilContainer = formEl.querySelector('[data-role="repeat-until-container"]');
  if (!repeatSelect || !repeatUntilInput || !repeatUntilContainer) return;

  syncRepeatUntilBounds(formEl);

  const showUntil = repeatSelect.value && repeatSelect.value !== 'never';
  repeatUntilContainer.style.display = showUntil ? 'block' : 'none';
  repeatUntilInput.disabled = !showUntil;
  repeatUntilInput.required = false; // optional — empty means no upper bound (expands to MAX_RECURRING_OCCURRENCES)

  if (!showUntil) {
    repeatUntilInput.value = '';
  }
}

function attachRepeatFieldHandlers() {
  document.querySelectorAll('.dynamic-form').forEach((formEl) => {
    const repeatSelect = getRepeatSelect(formEl);
    const primaryDateInput = getPrimaryDateInput(formEl);

    if (repeatSelect) {
      repeatSelect.addEventListener('change', () => {
        updateRepeatUntilVisibility(formEl);
      });
    }

    if (primaryDateInput) {
      primaryDateInput.addEventListener('change', () => {
        updateRepeatUntilVisibility(formEl);
      });
    }

    updateRepeatUntilVisibility(formEl);
  });
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatLocalDate(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cloneDate(dateObj) {
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
}

function addDays(dateObj, days) {
  const nextDate = cloneDate(dateObj);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function addMonths(dateObj, months) {
  const nextDate = cloneDate(dateObj);
  const originalDay = nextDate.getDate();
  nextDate.setDate(1);
  nextDate.setMonth(nextDate.getMonth() + months);
  const maxDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
  nextDate.setDate(Math.min(originalDay, maxDay));
  return nextDate;
}

function addYears(dateObj, years) {
  const nextDate = cloneDate(dateObj);
  const originalMonth = nextDate.getMonth();
  nextDate.setFullYear(nextDate.getFullYear() + years);
  if (nextDate.getMonth() !== originalMonth) {
    nextDate.setDate(0);
  }
  return nextDate;
}

function getNextRecurringDate(dateObj, repeatValue) {
  switch ((repeatValue || '').trim().toLowerCase()) {
    case 'every day':
      return addDays(dateObj, 1);
    case 'every week':
      return addDays(dateObj, 7);
    case 'every 2 weeks':
      return addDays(dateObj, 14);
    case 'every month':
      return addMonths(dateObj, 1);
    case 'every year':
      return addYears(dateObj, 1);
    case 'every weekday': {
      let nextDate = addDays(dateObj, 1);
      while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
        nextDate = addDays(nextDate, 1);
      }
      return nextDate;
    }
    case 'every weekend': {
      let nextDate = addDays(dateObj, 1);
      while (nextDate.getDay() !== 0 && nextDate.getDay() !== 6) {
        nextDate = addDays(nextDate, 1);
      }
      return nextDate;
    }
    default:
      return null;
  }
}

function expandRecurringEvent(eventObj, maxOccurrences = MAX_RECURRING_OCCURRENCES) {
  if (!eventObj) return [];

  const occurrences = [{
    ...eventObj,
    sourceEventId: eventObj.id,
    occurrenceIndex: 0,
    occurrenceCount: 1,
  }];

  const baseDate = parseLocalDate(eventObj.date);
  const repeatUntilDate = parseLocalDate(eventObj.repeatUntil);
  const hasRepeat = eventObj.repeat && eventObj.repeat !== 'never';
  if (!baseDate || !hasRepeat) {
    return occurrences;
  }

  let nextDate = cloneDate(baseDate);
  while (occurrences.length < maxOccurrences) {
    nextDate = getNextRecurringDate(nextDate, eventObj.repeat);
    if (!nextDate) break;
    if (repeatUntilDate && nextDate.getTime() > repeatUntilDate.getTime()) break;
    if (eventObj.excludedDates && eventObj.excludedDates.includes(formatLocalDate(nextDate))) continue;

    occurrences.push({
      ...eventObj,
      id: `${eventObj.id}__occurrence_${occurrences.length}`,
      date: formatLocalDate(nextDate),
      sourceEventId: eventObj.id,
      occurrenceIndex: occurrences.length,
      occurrenceCount: occurrences.length + 1,
    });
  }

  return occurrences;
}

function getEventsForDisplay() {
  return loadEventsFromStorage().flatMap((eventObj) => expandRecurringEvent(eventObj));
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
  const repeatSettings = getRepeatSettings(form);
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
    repeat: repeatSettings.repeat,
    repeatUntil: repeatSettings.repeatUntil,
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
  const repeatSettings = getRepeatSettings(form);
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
    repeat: repeatSettings.repeat,
    repeatUntil: repeatSettings.repeatUntil,
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
  const repeatSettings = getRepeatSettings(form);
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
    repeat: repeatSettings.repeat,
    repeatUntil: repeatSettings.repeatUntil,
    domain: '',
    bucket: '',
    additionalDetails: form.querySelector('textarea[name="focusAdditionalDetails"]').value.trim(),
    typeDetails: activeDetail ? collectInputValues(activeDetail) : {},
    createdAt: new Date().toISOString(),
  };
}

function buildJobEvent() {
  const form = document.getElementById('form-job');
  const repeatSettings = getRepeatSettings(form);
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
    repeat: repeatSettings.repeat,
    repeatUntil: repeatSettings.repeatUntil,
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
  const repeatSettings = getRepeatSettings(form);
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
    repeat: repeatSettings.repeat,
    repeatUntil: repeatSettings.repeatUntil,
    domain: form.querySelector('[name="domainSelect"]') ? form.querySelector('[name="domainSelect"]').value : '',
    bucket: form.querySelector('[name="bucketSelect"]') ? form.querySelector('[name="bucketSelect"]').value : '',
    additionalDetails: form.querySelector('textarea[name="meetingAdditionalDetails"]').value.trim(),
    typeDetails: activeDetail ? collectInputValues(activeDetail) : {},
    createdAt: new Date().toISOString(),
  };
}

/**
 * Wire each event form submit to its builder and storage call.
 * Call this once at the bottom of createEvent.html.
 */
function attachEventSaveHandlers() {
  const saveMap = {
    'form-appointment': buildAppointmentEvent,
    'form-event': buildEventEvent,
    'form-focus': buildFocusEvent,
    'form-job': buildJobEvent,
    'form-meeting': buildMeetingEvent,
  };

  Object.entries(saveMap).forEach(([formId, buildFn]) => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      const editId = form.dataset.editId;
      const editDate = form.dataset.editDate;
      const editScope = form.dataset.editScope || (editDate ? 'single' : 'all');
      const eventObj = buildFn();

      if (editId) {
        e.preventDefault();
        const original = loadEventById(editId);
        if (editScope === 'single' && editDate) {
          if (original) {
            const excluded = [...(original.excludedDates || [])];
            if (!excluded.includes(editDate)) excluded.push(editDate);
            updateEventInStorage({ ...original, excludedDates: excluded });
          }
          saveEventToStorage({ ...eventObj, id: generateEventId(), repeat: 'never', repeatUntil: '', excludedDates: [] });
        } else {
          updateEventInStorage({
            ...eventObj,
            id: editId,
            excludedDates: original && Array.isArray(original.excludedDates) ? original.excludedDates : [],
            createdAt: original && original.createdAt ? original.createdAt : eventObj.createdAt,
          });
        }
        closeEditWindowAndRefreshParent();
      } else {
        saveEventToStorage(eventObj);
        console.log('Event saved:', eventObj);
      }
    });
  });
}

function findSubtypeDetailDiv(formEl, eventType) {
  if (!eventType || !formEl) return null;
  for (const div of formEl.querySelectorAll('div[id$="Details"]')) {
    if (SUBTYPE_LABELS[div.id] === eventType) return div;
  }
  return null;
}

function cancelEventEdit() {
  // If this page is a popup, close it; otherwise return to the manager page.
  window.close();
  if (!window.closed) {
    window.location.href = 'manageEvents.html';
  }
}

function closeEditWindowAndRefreshParent() {
  try {
    if (window.opener && !window.opener.closed && typeof window.opener.renderManageEventsTable === 'function') {
      window.opener.renderManageEventsTable();
    }
  } catch (e) { /* ignore opener access issues */ }

  window.close();
  if (!window.closed) {
    window.location.href = 'manageEvents.html';
  }
}

async function deleteEventFromEditMode(formEl) {
  if (!formEl) return;

  const editId = formEl.dataset.editId;
  const editDate = formEl.dataset.editDate || '';
  const storedEvent = editId ? loadEventById(editId) : null;
  if (!editId || !storedEvent) return;

  const hasRepeat = storedEvent.repeat && storedEvent.repeat !== 'never';
  if (hasRepeat) {
    const result = await Swal.fire({
      ...getSwalThemeOptions(),
      title: 'Delete recurring event',
      text: 'Delete just this occurrence or all occurrences?',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'This occurrence',
      denyButtonText: 'All occurrences',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      const targetDate = editDate || storedEvent.date;
      excludeRecurringDate(editId, targetDate);
      closeEditWindowAndRefreshParent();
      return;
    }

    if (result.isDenied) {
      deleteEventById(editId);
      closeEditWindowAndRefreshParent();
      return;
    }

    return;
  }

  const confirmDelete = await Swal.fire({
    ...getSwalThemeOptions(),
    title: 'Delete event?',
    text: 'This cannot be undone.',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
  });

  if (!confirmDelete.isConfirmed) return;

  deleteEventById(editId);
  closeEditWindowAndRefreshParent();
}

function populateFormFromEvent(formEl, eventObj, overrideDate) {
  if (!formEl || !eventObj) return;
  const c = eventObj.eventCategory || '';

  function setById(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.value = value;
  }

  setById(`${c}Title`, eventObj.title);
  setById(`${c}Date`, overrideDate || eventObj.date);
  setById(`${c}StartTime`, eventObj.startTime);
  setById(`${c}EndTime`, eventObj.endTime);
  setById(`${c}Location`, eventObj.location);

  const repeatSelect = getRepeatSelect(formEl);
  if (repeatSelect) {
    repeatSelect.value = eventObj.repeat || 'never';
    updateRepeatUntilVisibility(formEl);
    const untilInput = getRepeatUntilInput(formEl);
    if (untilInput) untilInput.value = eventObj.repeatUntil || ''; // always restore original (including empty)
  }

  const domainSel = formEl.querySelector('[name="domainSelect"]');
  const bucketSel = formEl.querySelector('[name="bucketSelect"]');
  if (domainSel && eventObj.domain) domainSel.value = eventObj.domain;
  if (bucketSel && eventObj.bucket) bucketSel.value = eventObj.bucket;

  const textarea = formEl.querySelector('textarea');
  if (textarea && eventObj.additionalDetails) textarea.value = eventObj.additionalDetails;

  if (eventObj.eventType) {
    const detailDiv = findSubtypeDetailDiv(formEl, eventObj.eventType);
    if (detailDiv) {
      formEl.querySelectorAll('div[id$="Details"]').forEach((d) => d.classList.add('hidden'));
      detailDiv.classList.remove('hidden');
      formEl.querySelectorAll('button[aria-controls]').forEach((btn) => {
        btn.setAttribute('aria-expanded', btn.getAttribute('aria-controls') === detailDiv.id ? 'true' : 'false');
      });
      if (eventObj.typeDetails && typeof eventObj.typeDetails === 'object') {
        Object.entries(eventObj.typeDetails).forEach(([name, val]) => {
          const input = detailDiv.querySelector(`[name="${name}"]`);
          if (input) input.value = val;
        });
      }
    }
  }
}

function initEditMode() {
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('editId');
  if (!editId) return;

  const storedEvent = loadEventById(editId);
  if (!storedEvent) return;

  const editDate = params.get('editDate') || null;
  const editScope = params.get('editScope') || (editDate ? 'single' : 'all');

  formSwap(storedEvent.eventCategory);
  const formEl = document.getElementById('form-' + storedEvent.eventCategory);
  if (!formEl) return;

  const backButton = formEl.querySelector('button[onclick*="returnType"]');
  if (backButton) {
    backButton.textContent = 'Cancel';
    backButton.classList.add('edit-cancel-button');
    backButton.removeAttribute('onclick');
    backButton.addEventListener('click', cancelEventEdit);

    const saveButton = formEl.querySelector('button[type="submit"]');
    if (saveButton) {
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'type edit-delete-button';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', async () => {
        await deleteEventFromEditMode(formEl);
      });
      formEl.insertBefore(deleteButton, saveButton);
    }
  }

  formEl.dataset.editId = editId;
  formEl.dataset.editScope = editScope;
  if (editDate) {
    formEl.dataset.editDate = editDate;
  } else {
    delete formEl.dataset.editDate;
  }

  populateFormFromEvent(formEl, storedEvent, editDate);

  if (editScope === 'single' && editDate) {
    const repeatSel = getRepeatSelect(formEl);
    if (repeatSel) {
      repeatSel.value = 'never';
      updateRepeatUntilVisibility(formEl);
    }
  }
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimeForDisplay(timeStr) {
  if (!timeStr) return '-';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return timeStr;
  const dt = new Date();
  dt.setHours(hour, minute, 0, 0);
  return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function prettifyFieldName(fieldName) {
  if (!fieldName) return '';
  return fieldName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .trim();
}

function getLinkLabel(fieldName) {
  const key = String(fieldName || '').toLowerCase();
  if (key.includes('provider') && key.includes('link')) return 'Provider Link';
  if (key.includes('organization') && key.includes('link')) return 'Organization Link';
  if (key.includes('meeting') && key.includes('link')) return 'Meeting Link';
  if (key.includes('event') && key.includes('link')) return 'Event Link';
  if (key.includes('link') || key.includes('url') || key.includes('website')) return 'Link';
  return '';
}

function createTextLine(value, boldValue = false) {
  const line = document.createElement('div');
  if (boldValue) {
    const strong = document.createElement('strong');
    strong.textContent = value;
    line.appendChild(strong);
  } else {
    line.textContent = value;
  }
  return line;
}

function renderTypeDetails(container, typeDetails) {
  if (!typeDetails || typeof typeDetails !== 'object') return;
  Object.entries(typeDetails).forEach(([key, value]) => {
    if (value === null || value === undefined || String(value).trim() === '') return;
    const line = document.createElement('div');
    const label = prettifyFieldName(key);
    const val = String(value).trim();
    if (/^https?:\/\//i.test(val)) {
      const anchor = document.createElement('a');
      anchor.href = val;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = getLinkLabel(key) || label || 'Link';
      line.appendChild(anchor);
    } else {
      line.appendChild(document.createTextNode((label ? label + ': ' : '')));
      const strong = document.createElement('strong');
      strong.textContent = val;
      line.appendChild(strong);
    }
    container.appendChild(line);
  });
}

function renderEventRow(eventObj) {
  const row = document.createElement('tr');
  const repeatValue = (eventObj.repeat || '').trim();
  const eventIdForActions = eventObj.sourceEventId || eventObj.id;

  const iconCell = document.createElement('td');
  if (eventObj.icon && /<svg[\s\S]*<\/svg>/.test(eventObj.icon)) {
    iconCell.innerHTML = eventObj.icon;
  }
  row.appendChild(iconCell);

  const titleCell = document.createElement('td');
  titleCell.appendChild(createTextLine(eventObj.title || '(Untitled Event)', true));
  titleCell.dataset.eventId = eventIdForActions;
  titleCell.dataset.eventDate = eventObj.date;
  titleCell.style.cursor = 'pointer';
  row.appendChild(titleCell);

  const domainCell = document.createElement('td');
  const domainLine = document.createElement('div');
  domainLine.appendChild(document.createTextNode('Domain: '));
  const domainStrong = document.createElement('strong');
  domainStrong.textContent = eventObj.domain || '-';
  domainLine.appendChild(domainStrong);
  const bucketLine = document.createElement('div');
  bucketLine.appendChild(document.createTextNode('Bucket: '));
  const bucketStrong = document.createElement('strong');
  bucketStrong.textContent = eventObj.bucket || '-';
  bucketLine.appendChild(bucketStrong);
  domainCell.appendChild(domainLine);
  domainCell.appendChild(bucketLine);
  row.appendChild(domainCell);

  const logisticsCell = document.createElement('td');
  logisticsCell.appendChild(createTextLine(formatDateForDisplay(eventObj.date), true));
  const timeLine = document.createElement('div');
  timeLine.appendChild(document.createTextNode('from '));
  const startStrong = document.createElement('strong');
  startStrong.textContent = formatTimeForDisplay(eventObj.startTime);
  timeLine.appendChild(startStrong);
  timeLine.appendChild(document.createTextNode(' to '));
  const endStrong = document.createElement('strong');
  endStrong.textContent = formatTimeForDisplay(eventObj.endTime);
  timeLine.appendChild(endStrong);
  logisticsCell.appendChild(timeLine);
  const locationLine = document.createElement('div');
  locationLine.appendChild(document.createTextNode('at '));
  const locationStrong = document.createElement('strong');
  locationStrong.textContent = eventObj.location || '-';
  locationLine.appendChild(locationStrong);
  logisticsCell.appendChild(locationLine);
  const repeatLine = document.createElement('div');
  const hasEveryPrefix = repeatValue.toLowerCase().startsWith('every ');
  repeatLine.appendChild(document.createTextNode(hasEveryPrefix ? 'every ' : 'Repeats: '));
  const repeatStrong = document.createElement('strong');
  repeatStrong.textContent = hasEveryPrefix ? repeatValue.slice('every '.length) : (repeatValue || 'never');
  repeatLine.appendChild(repeatStrong);
  logisticsCell.appendChild(repeatLine);
  row.appendChild(logisticsCell);

  const detailsCell = document.createElement('td');
  detailsCell.appendChild(createTextLine(eventObj.eventType || eventObj.eventCategory || 'Event'));
  renderTypeDetails(detailsCell, eventObj.typeDetails);
  row.appendChild(detailsCell);

  const additionalCell = document.createElement('td');
  const additionalDetailsTrigger = document.createElement('a');
  additionalDetailsTrigger.href = '#';
  additionalDetailsTrigger.textContent = 'Additional Details';
  additionalDetailsTrigger.dataset.action = 'show-additional-details';
  additionalDetailsTrigger.dataset.eventId = eventIdForActions;
  additionalDetailsTrigger.dataset.eventDate = eventObj.date;
  additionalCell.appendChild(additionalDetailsTrigger);
  const subtasksLine = document.createElement('div');
  const subtasksStrong = document.createElement('strong');
  subtasksStrong.textContent = '0';
  subtasksLine.appendChild(subtasksStrong);
  subtasksLine.appendChild(document.createTextNode(' subtasks'));
  additionalCell.appendChild(subtasksLine);
  const remindersLine = document.createElement('div');
  const remindersStrong = document.createElement('strong');
  remindersStrong.textContent = '0';
  remindersLine.appendChild(remindersStrong);
  remindersLine.appendChild(document.createTextNode(' reminders'));
  additionalCell.appendChild(remindersLine);
  row.appendChild(additionalCell);

  return row;
}

function getEventSortValue(eventObj) {
  if (!eventObj || !eventObj.date) return Number.MAX_SAFE_INTEGER;
  const datePart = eventObj.date;
  const timePart = eventObj.startTime || '00:00';
  const dt = new Date(datePart + 'T' + timePart);
  return Number.isNaN(dt.getTime()) ? Number.MAX_SAFE_INTEGER : dt.getTime();
}

function renderManageEventsTable() {
  const tableBody = document.getElementById('eventsTableBody');
  if (!tableBody) return;

  const events = getEventsForDisplay();
  tableBody.innerHTML = '';

  if (!events.length) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 6;
    emptyCell.textContent = 'No saved events yet.';
    emptyRow.appendChild(emptyCell);
    tableBody.appendChild(emptyRow);
    return;
  }

  const sortedEvents = [...events].sort((a, b) => {
    const aSort = getEventSortValue(a);
    const bSort = getEventSortValue(b);
    if (aSort !== bSort) return aSort - bSort;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  sortedEvents.forEach((eventObj) => {
    tableBody.appendChild(renderEventRow(eventObj));
  });
}

renderManageEventsTable();

function openEditPopup(url) {
  const width = 600;
  const height = 700;
  const left = (screen.width / 2) - (width / 2);
  const top = (screen.height / 2) - (height / 2);
  window.open(
    url,
    'Edit_Event',
    'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + ',resizable=yes,scrollbars=yes'
  );
}

async function startEventEditFlow(eventId, eventDate) {
  const storedEvent = loadEventById(eventId);
  if (!storedEvent) return;
  const hasRepeat = storedEvent.repeat && storedEvent.repeat !== 'never';
  if (hasRepeat) {
    const result = await Swal.fire({
      ...getSwalThemeOptions(),
      title: 'Edit recurring event',
      text: 'Edit just this occurrence or all occurrences?',
      icon: 'question',
      showDenyButton: true,
      confirmButtonText: 'This occurrence',
      denyButtonText: 'All occurrences',
      showCancelButton: true,
    });
    if (result.isConfirmed) {
      openEditPopup(`createEvent.html?editId=${encodeURIComponent(eventId)}&editDate=${encodeURIComponent(eventDate)}&editScope=single`);
    } else if (result.isDenied) {
      openEditPopup(`createEvent.html?editId=${encodeURIComponent(eventId)}&editScope=all`);
    }
  } else {
    openEditPopup(`createEvent.html?editId=${encodeURIComponent(eventId)}&editScope=all`);
  }
}

function attachManageEventsHandlers() {
  const tableBody = document.getElementById('eventsTableBody');
  if (!tableBody) return;

  tableBody.addEventListener('click', async (e) => {
    const additionalDetailsTrigger = e.target.closest('[data-action="show-additional-details"]');
    if (additionalDetailsTrigger) {
      e.preventDefault();
      const eventId = additionalDetailsTrigger.dataset.eventId;
      const eventDate = additionalDetailsTrigger.dataset.eventDate;
      const storedEvent = loadEventById(eventId);
      if (!storedEvent) return;

      const detailsText = (storedEvent.additionalDetails || '').trim() || 'No additional details provided.';
      const result = await Swal.fire({
        ...getSwalThemeOptions(),
        title: 'Additional Details',
        text: detailsText,
        showCancelButton: true,
        confirmButtonText: 'Edit',
        cancelButtonText: 'Close',
      });

      if (result.isConfirmed) {
        await startEventEditFlow(eventId, eventDate);
      }
      return;
    }

    const titleCell = e.target.closest('td[data-event-id]');
    if (!titleCell) return;
    const eventId = titleCell.dataset.eventId;
    const eventDate = titleCell.dataset.eventDate;
    await startEventEditFlow(eventId, eventDate);
  });
}
attachRepeatFieldHandlers();
