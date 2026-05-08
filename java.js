// service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (window.location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js');
    } else {
      // If this app is opened directly from disk, clear stale SW state from prior hosted runs.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      }).catch(() => {});

      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        }).catch(() => {});
      }
    }
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

/**
 * Open createBucket.html in edit mode for an existing bucket.
 * Uses a per-bucket window name so each bucket gets its own popup slot.
 * @param {string} bucketId
 */
function openEditBucketPopup(bucketId) {
  const width = 600;
  const height = 700;
  const left = (screen.width / 2) - (width / 2);
  const top  = (screen.height / 2) - (height / 2);
  const url  = 'createBucket.html?id=' + encodeURIComponent(bucketId);
  window.open(
    url,
    'Edit_Bucket_' + bucketId,
    'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + ',resizable=yes,scrollbars=yes'
  );
}

/** Close this bucket popup and tell the opener to re-render its bucket grid. */
function closeBucketWindowAndRefresh(domain) {
  try {
    if (window.opener && !window.opener.closed && typeof window.opener.renderManageBuckets === 'function') {
      window.opener.renderManageBuckets(domain);
    }
  } catch (_) { /* cross-origin safety */ }
  window.close();
}

/**
 * Pre-fill createBucketForm from a stored bucket object (edit mode).
 * Triggers the correct revealOnClick section and restores icon selection.
 */
function prefillBucketForm(bucket) {
  const form = document.getElementById('createBucketForm');
  if (!form || !bucket) return;

  // Store edit id on the form so save handler knows it's an update
  form.dataset.editId = bucket.id;
  form.dataset.editDomain = bucket.domain;

  // Title
  const titleEl = document.getElementById('bucketTitle');
  if (titleEl) titleEl.value = bucket.title || '';

  // Map kind+domain to the button that triggers the section reveal
  const kindButtonMap = {
    personal:  { project: 'personalType1',  tag: 'personalType2'  },
    household: { project: 'householdType1', tag: 'householdType2' },
    jobs:      { job: 'jobsType0', project: 'jobsType1', tag: 'jobsType2' },
  };
  const btnId = (kindButtonMap[bucket.domain] || {})[bucket.bucketKind];
  if (btnId) {
    const btn = document.getElementById(btnId);
    if (btn) btn.click(); // triggers revealOnClick to show the right options panel
  }

  // Subtype option — select or hidden input
  const optionInputMap = {
    personalType1Options:  'personalType1Option',
    personalType2Options:  'personalType2Option',
    householdType1Options: 'householdType1Option',
    householdType2Options: 'householdType2Option',
    jobsType0Options:      'jobsType0Option',
    jobsType1Options:      'jobsType1Option',
    jobsType2Options:      'jobsType2Option',
  };
  const sectionSuffixMap = {
    personal:  { project: 'personalType1Options',  tag: 'personalType2Options'  },
    household: { project: 'householdType1Options', tag: 'householdType2Options' },
    jobs:      { job: 'jobsType0Options', project: 'jobsType1Options', tag: 'jobsType2Options' },
  };
  const optionSectionId = (sectionSuffixMap[bucket.domain] || {})[bucket.bucketKind];
  if (optionSectionId) {
    const optionInputId = optionInputMap[optionSectionId];
    const optionEl = document.getElementById(optionInputId);
    if (optionEl) {
      optionEl.value = bucket.subtypeOption || '';
      // If it's a <select>, set it directly; if hidden with job buttons, activate the right button
      if (optionEl.tagName === 'SELECT') {
        optionEl.value = bucket.subtypeOption || '';
      } else if (bucket.domain === 'jobs' && bucket.bucketKind === 'job') {
        // Re-activate the matching data-value button
        document.querySelectorAll('#jobsType0Options button[data-value]').forEach((b) => {
          b.classList.toggle('active', b.dataset.value === bucket.subtypeOption);
        });
      }
    }
  }

  // Description
  const descInputMap = {
    personalType1Options:  'personalType1Description',
    householdType1Options: 'householdType1Description',
    jobsType1Options:      'jobsType1Description',
  };
  if (optionSectionId && descInputMap[optionSectionId]) {
    const descEl = document.getElementById(descInputMap[optionSectionId]);
    if (descEl) descEl.value = bucket.description || '';
  }

  // Icon overwrite radios + hidden icon input + preview
  const iconRadioMap = {
    personalType1Options:  'personalIconOverwrite',
    personalType2Options:  'personalTagIconOverwrite',
    householdType1Options: 'householdIconOverwrite',
    householdType2Options: 'householdTagIconOverwrite',
    jobsType0Options:      'jobsJobIconOverwrite',
    jobsType1Options:      'jobsIconOverwrite',
    jobsType2Options:      'jobsTagIconOverwrite',
  };
  const iconInputMap = {
    personalType1Options:  'personalProjectIconId',
    personalType2Options:  'personalTagIconId',
    householdType1Options: 'householdProjectIconId',
    householdType2Options: 'householdTagIconId',
    jobsType0Options:      'jobsJobIconId',
    jobsType1Options:      'jobsProjectIconId',
    jobsType2Options:      'jobsTagIconId',
  };
  const iconPreviewMap = {
    personalType1Options:  'personalProjectIconPreview',
    personalType2Options:  'personalTagIconPreview',
    householdType1Options: 'householdProjectIconPreview',
    householdType2Options: 'householdTagIconPreview',
    jobsType0Options:      'jobsJobIconPreview',
    jobsType1Options:      'jobsProjectIconPreview',
    jobsType2Options:      'jobsTagIconPreview',
  };

  if (optionSectionId) {
    const radioName = iconRadioMap[optionSectionId];
    const value     = bucket.iconOverrideEnabled ? 'yes' : 'no';
    if (radioName) {
      const radio = form.querySelector(`input[type="radio"][name="${radioName}"][value="${value}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    }
    if (bucket.iconOverrideEnabled && bucket.iconId) {
      const iconInputEl = document.getElementById(iconInputMap[optionSectionId]);
      if (iconInputEl) iconInputEl.value = bucket.iconId;
      const previewEl = document.getElementById(iconPreviewMap[optionSectionId]);
      if (previewEl) {
        const svg = getIconSvgById(bucket.iconId);
        const entry = ICON_LIBRARY.find((i) => i.id === bucket.iconId);
        previewEl.innerHTML = svg + (entry ? ' <span>' + entry.label + '</span>' : '');
      }
    }
  }

  // Update submit button label and reveal Delete button
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = 'Save Changes';
  const deleteBtn = document.getElementById('deleteBucketBtn');
  if (deleteBtn) deleteBtn.style.display = '';
}

/** Swal-confirmed delete from edit mode — removes bucket, refreshes opener, closes popup. */
async function deleteBucketFromEditMode() {
  const form = document.getElementById('createBucketForm');
  if (!form) return;
  const bucketId = form.dataset.editId;
  const domain   = form.dataset.editDomain;
  if (!bucketId) return;

  const result = await Swal.fire({
    ...getSwalThemeOptions(),
    title: 'Delete bucket?',
    text: 'This cannot be undone.',
    showCancelButton: true,
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
    icon: 'warning',
  });

  if (result.isConfirmed) {
    deleteBucketById(bucketId);
    closeBucketWindowAndRefresh(domain);
  }
}

/**
 * Open createBucket.html as a centred child popup.
 * @param {string} domain - 'personal' | 'household' | 'jobs'
 */
function openCreateBucketPopup(domain) {
  const width = 600;
  const height = 700;
  const left = (screen.width / 2) - (width / 2);
  const top = (screen.height / 2) - (height / 2);

  const url = 'createBucket.html?domain=' + encodeURIComponent(domain || '');
  window.open(
    url,
    'Create_Bucket',
    'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + ',resizable=yes,scrollbars=yes'
  );
}

/**
 * Call once at the bottom of createBucket.html.
 * Reads the ?domain query param, writes it into the hidden #bucketDomain input,
 * and reveals the matching domain section.
 */
function initCreateBucket() {
  if (initCreateBucket._initialized) {
    return;
  }
  initCreateBucket._initialized = true;

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id') || '';
  const editBucket = editId ? loadBucketById(editId) : null;
  const domain = editBucket
    ? editBucket.domain
    : (params.get('domain') || '').toLowerCase().trim();
  const domainLabelMap = {
    personal: 'Personal',
    household: 'Household',
    jobs: 'Jobs',
  };

  const domainInput = document.getElementById('bucketDomain');
  if (domainInput) domainInput.value = domain;

  const domainLabel = document.getElementById('bucketDomainLabel');
  if (domainLabel) domainLabel.textContent = domainLabelMap[domain] || 'Unknown';

  const sectionMap = {
    personal: 'personalDomain',
    household: 'householdDomain',
    jobs: 'jobsDomain',
  };

  const sectionId = sectionMap[domain];
  if (sectionId) {
    const section = document.getElementById(sectionId);
    if (section) section.style.display = 'block';
  }

  setupIconOverwriteToggle('personalIconOverwrite', 'personalIconSelectContainer');
  setupIconOverwriteToggle('personalTagIconOverwrite', 'personalTagIconSelectContainer');
  setupIconOverwriteToggle('householdIconOverwrite', 'householdIconSelectContainer');
  setupIconOverwriteToggle('householdTagIconOverwrite', 'householdTagIconSelectContainer');
  setupIconOverwriteToggle('jobsIconOverwrite', 'jobsIconSelectContainer');
  setupIconOverwriteToggle('jobsTagIconOverwrite', 'jobsTagIconSelectContainer');
  setupIconOverwriteToggle('jobsJobIconOverwrite', 'jobsJobIconSelectContainer');

  // Wire each Select Icon button to openIconPicker with its hidden input, preview span, and domain
  const _iconButtonMap = [
    { buttonId: 'personalSelectIcon',     inputId: 'personalProjectIconId',  previewId: 'personalProjectIconPreview',  domain: 'personal'  },
    { buttonId: 'personalTagSelectIcon',  inputId: 'personalTagIconId',       previewId: 'personalTagIconPreview',       domain: 'personal'  },
    { buttonId: 'householdSelectIcon',    inputId: 'householdProjectIconId',  previewId: 'householdProjectIconPreview',  domain: 'household' },
    { buttonId: 'householdTagSelectIcon', inputId: 'householdTagIconId',      previewId: 'householdTagIconPreview',      domain: 'household' },
    { buttonId: 'jobsJobSelectIcon',      inputId: 'jobsJobIconId',           previewId: 'jobsJobIconPreview',           domain: 'jobs'      },
    { buttonId: 'jobsSelectIcon',         inputId: 'jobsProjectIconId',       previewId: 'jobsProjectIconPreview',       domain: 'jobs'      },
    { buttonId: 'jobsTagSelectIcon',      inputId: 'jobsTagIconId',           previewId: 'jobsTagIconPreview',           domain: 'jobs'      },
  ];
  _iconButtonMap.forEach(({ buttonId, inputId, previewId, domain }) => {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.addEventListener('click', () => openIconPicker(inputId, previewId, domain));
  });

  // Wire Job-type option buttons (jobsType0) to record the chosen option in the hidden input
  ['jobsType0Option1', 'jobsType0Option2'].forEach((btnId) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const hiddenInput = document.getElementById('jobsType0Option');
      if (hiddenInput) hiddenInput.value = btn.dataset.value || btnId;
      document.querySelectorAll('#jobsType0Options button[data-value]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  _attachIconPickerModalHandlers();

  // Edit mode: pre-fill form after all handlers are wired
  if (editBucket) {
    prefillBucketForm(editBucket);
  }

  // Wire the Delete button (only visible in edit mode)
  const deleteBtn = document.getElementById('deleteBucketBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteBucketFromEditMode);
  }
}

function setupIconOverwriteToggle(radioName, containerId) {
  const radios = Array.from(document.querySelectorAll(`input[type="radio"][name="${radioName}"]`));
  const container = document.getElementById(containerId);
  if (!radios.length || !container) {
    return;
  }

  const sync = () => {
    const selected = radios.find((radio) => radio.checked);
    container.style.display = selected && selected.value === 'yes' ? 'block' : 'none';
  };

  radios.forEach((radio) => {
    if (radio.dataset.iconToggleBound === 'true') {
      return;
    }
    radio.addEventListener('change', sync);
    radio.addEventListener('input', sync);
    radio.dataset.iconToggleBound = 'true';
  });

  sync();
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
  if (!button || !target) {
    return;
  }

  const hideTarget = (el) => {
    el.classList.add('hidden');
    el.style.display = 'none';
  };

  const showTarget = (el) => {
    el.classList.remove('hidden');
    el.style.display = 'block';
  };

  button.setAttribute('aria-expanded', 'false');
  hideTarget(target);
  _revealOnClickRegistry.push({ button, target });
  button.addEventListener('click', () => {
    const isOpen = window.getComputedStyle(target).display !== 'none';
    _revealOnClickRegistry.forEach(entry => {
      hideTarget(entry.target);
      entry.button.setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) {
      showTarget(target);
      button.setAttribute('aria-expanded', 'true');
    }
  });
}

// ── Event Storage Framework ──────────────────────────────────────────────────

const EVENTS_STORAGE_KEY = 'timescapeEvents';
const MAX_RECURRING_OCCURRENCES = 12;

// ── Icon Library ─────────────────────────────────────────────────────────────
// Each entry: { id, label, domain, svg }
// domain: 'personal' | 'household' | 'jobs'
// SVGs sourced from createEvent.html inline icons and normalized:
//   - SVGRepo wrapper <g> elements stripped
//   - stroke="#000000" → stroke="currentColor"
//   - fill="#000000" → fill="currentColor" (fill-based icons only)
//   - stroke-width normalised to 1.5
//   - inline <style>/.cls-* converted to inline attributes
const ICON_LIBRARY = [
  // ── Personal ───────────────────────────────────────────────────────────
  {
    // Source: medicalDetails in createEvent.html (hospital building with cross)
    id: 'appt-medical', label: 'Medical', domain: 'personal',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 6H5.2C4.0799 6 3.51984 6 3.09202 6.21799C2.71569 6.40973 2.40973 6.71569 2.21799 7.09202C2 7.51984 2 8.0799 2 9.2V17.8C2 18.9201 2 19.4802 2.21799 19.908C2.40973 20.2843 2.71569 20.5903 3.09202 20.782C3.51984 21 4.0799 21 5.2 21H18.8C19.9201 21 20.4802 21 20.908 20.782C21.2843 20.5903 21.5903 20.2843 21.782 19.908C22 19.4802 22 18.9201 22 17.8V9.2C22 8.07989 22 7.51984 21.782 7.09202C21.5903 6.71569 21.2843 6.40973 20.908 6.21799C20.4802 6 19.9201 6 18.8 6H17M2 10H4M20 10H22M2 14H4M20 14H22M12 6V10M10 8H14M17 21V6.2C17 5.0799 17 4.51984 16.782 4.09202C16.5903 3.71569 16.2843 3.40973 15.908 3.21799C15.4802 3 14.9201 3 13.8 3H10.2C9.07989 3 8.51984 3 8.09202 3.21799C7.71569 3.40973 7.40973 3.71569 7.21799 4.09202C7 4.51984 7 5.0799 7 6.2V21H17ZM14 21V17C14 15.8954 13.1046 15 12 15C10.8954 15 10 15.8954 10 17V21H14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    // Source: psychologicalDetails in createEvent.html (brain/tree — fill-based icon)
    id: 'appt-psychological', label: 'Mental Health', domain: 'personal',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M22,11A4,4,0,0,0,20,7.52,3,3,0,0,0,20,7a3,3,0,0,0-3-3l-.18,0A3,3,0,0,0,12,2.78,3,3,0,0,0,7.18,4L7,4A3,3,0,0,0,4,7a3,3,0,0,0,0,.52,4,4,0,0,0-.55,6.59A4,4,0,0,0,7,20l.18,0A3,3,0,0,0,12,21.22,3,3,0,0,0,16.82,20L17,20a4,4,0,0,0,3.5-5.89A4,4,0,0,0,22,11ZM11,8.55a4.72,4.72,0,0,0-.68-.32,1,1,0,0,0-.64,1.9A2,2,0,0,1,11,12v1.55a4.72,4.72,0,0,0-.68-.32,1,1,0,0,0-.64,1.9A2,2,0,0,1,11,17v2a1,1,0,0,1-1,1,1,1,0,0,1-.91-.6,4.07,4.07,0,0,0,.48-.33,1,1,0,1,0-1.28-1.54A2,2,0,0,1,7,18a2,2,0,0,1-2-2,2,2,0,0,1,.32-1.06A3.82,3.82,0,0,0,6,15a1,1,0,0,0,0-2,1.84,1.84,0,0,1-.69-.13A2,2,0,0,1,5,9.25a3.1,3.1,0,0,0,.46.35,1,1,0,1,0,1-1.74.9.9,0,0,1-.34-.33A.92.92,0,0,1,6,7,1,1,0,0,1,7,6a.76.76,0,0,1,.21,0,3.85,3.85,0,0,0,.19.47,1,1,0,0,0,1.37.37A1,1,0,0,0,9.13,5.5,1.06,1.06,0,0,1,9,5a1,1,0,0,1,2,0Zm7.69,4.32A1.84,1.84,0,0,1,18,13a1,1,0,0,0,0,2,3.82,3.82,0,0,0,.68-.06A2,2,0,0,1,19,16a2,2,0,0,1-2,2,2,2,0,0,1-1.29-.47,1,1,0,0,0-1.28,1.54,4.07,4.07,0,0,0,.48.33A1,1,0,0,1,14,20a1,1,0,0,1-1-1V17a2,2,0,0,1,1.32-1.87,1,1,0,0,0-.64-1.9,4.72,4.72,0,0,0-.68.32V12a2,2,0,0,1,1.32-1.87,1,1,0,0,0-.64-1.9,4.72,4.72,0,0,0-.68.32V5a1,1,0,0,1,2,0,1.06,1.06,0,0,1-.13.5,1,1,0,0,0,.36,1.37A1,1,0,0,0,16.6,6.5,3.85,3.85,0,0,0,16.79,6,.76.76,0,0,1,17,6a1,1,0,0,1,1,1,1,1,0,0,1-.17.55.9.9,0,0,1-.33.31,1,1,0,0,0,1,1.74A2.66,2.66,0,0,0,19,9.25a2,2,0,0,1-.27,3.62Z"/></svg>',
  },
  {
    // Source: personalCareDetails in createEvent.html (person silhouette + heart)
    id: 'appt-personal-care', label: 'Personal Care', domain: 'personal',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 21V18.5C4 15.4624 6.46243 13 9.5 13H13.5M8 21V18M16 6.5C16 8.70914 14.2091 10.5 12 10.5C9.79086 10.5 8 8.70914 8 6.5C8 4.29086 9.79086 2.5 12 2.5C14.2091 2.5 16 4.29086 16 6.5ZM17.5 12.9998C17.0439 12.3927 16.3178 12 15.5 12C14.1193 12 13 13.1193 13 14.5C13 15.1195 13.2253 15.6864 13.5985 16.1231L17.5 21L21.4015 16.1231C21.7747 15.6864 22 15.1195 22 14.5C22 13.1193 20.8807 12 19.5 12C18.6822 12 17.9561 12.3927 17.5 12.9998Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'event-community', label: 'Community', domain: 'personal',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M12 3c-1.5 3-2 5.5-2 9s.5 6 2 9m0-18c1.5 3 2 5.5 2 9s-.5 6-2 9M3 12h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  {
    id: 'event-social', label: 'Social', domain: 'personal',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'focus-reading', label: 'Reading', domain: 'personal',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'focus-writing', label: 'Writing', domain: 'personal',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'focus-fitness', label: 'Fitness', domain: 'personal',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="9" width="3" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="19" y="9" width="3" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="7" width="2" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="18" y="7" width="2" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  {
    id: 'meeting-personal', label: 'Personal Meeting', domain: 'personal',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'personal-wellness', label: 'Wellness', domain: 'personal',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  // ── Household ──────────────────────────────────────────────────────────
  {
    // Source: personalServiceDetails in createEvent.html (group of people / service)
    id: 'appt-personal-service', label: 'Personal Service', domain: 'household',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 21V18.5C4 15.4624 6.46243 13 9.5 13H14.5C17.5376 13 20 15.4624 20 18.5V21M8 21V18M16 21V18M11 9H7.5C6.67157 9 6 8.32843 6 7.5V6.5C6 5.16725 6.57938 3.96983 7.5 3.14585M18 8.00001V6.50001C18 5.16726 17.4206 3.96983 16.5 3.14585M20 7.5V6M4 7.5V6M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'household-home', label: 'Home', domain: 'household',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'household-tools', label: 'Tools', domain: 'household',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'household-clean', label: 'Cleaning', domain: 'household',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21l8-8m0 0 5.5-5.5C19 6 19 4 17 2s-4 0-5.5 1.5L6 9m5 4H4v7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'household-shop', label: 'Shopping', domain: 'household',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'household-plant', label: 'Garden', domain: 'household',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22V12m0 0C12 7 8 4 4 5c0 4 3 7 8 7zm0 0c0-5 4-8 8-7-1 4-4 7-8 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'household-light', label: 'Energy', domain: 'household',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="9" y1="18" x2="15" y2="18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="10" y1="22" x2="14" y2="22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'household-key', label: 'Security', domain: 'household',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7.5" cy="15.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M21 2 10.5 12.5m0 0 2 2m-2-2-2 2m7-7 2 2m-2-2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'household-food', label: 'Kitchen', domain: 'household',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="8" x2="18" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="8" x2="6" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6 3v5a6 6 0 0 0 12 0V3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'household-car', label: 'Vehicle', domain: 'household',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 17H3v-5l2-5h14l2 5v5h-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7.5" cy="17.5" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="16.5" cy="17.5" r="2.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 12h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  // ── Jobs ───────────────────────────────────────────────────────────────
  {
    // Source: interviewDetails in createEvent.html (person silhouette + question mark)
    id: 'appt-interview', label: 'Interview', domain: 'jobs',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 14.0709C11.6734 14.0242 11.3395 14 11 14C7.13401 14 4 17.134 4 21H14M17.997 18C18.997 17 19.997 16.6046 19.997 15.5C19.997 14.3954 19.1016 13.5 17.997 13.5C17.0651 13.5 16.282 14.1374 16.06 15M17.997 21H18.007M15 7C15 9.20914 13.2091 11 11 11C8.79086 11 7 9.20914 7 7C7 4.79086 8.79086 3 11 3C13.2091 3 15 4.79086 15 7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    // Source: professionalServiceDetails in createEvent.html (.cls-1 style converted to inline attributes)
    id: 'appt-professional-service', label: 'Professional Service', domain: 'jobs',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="4.37" r="2.87" stroke="currentColor" stroke-width="1.5"/><path d="M12,7.24h0A4.78,4.78,0,0,1,16.78,12v1a0,0,0,0,1,0,0H7.22a0,0,0,0,1,0,0V12A4.78,4.78,0,0,1,12,7.24Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="23.48" y1="12.98" x2="0.52" y2="12.98" stroke="currentColor" stroke-width="1.5"/><polyline points="3.39 23.5 3.39 12.98 20.61 12.98 20.61 23.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="7.22" y="16.8" width="9.57" height="3.83" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  },
  {
    id: 'event-professional', label: 'Professional Event', domain: 'jobs',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M9 9h1m4 0h1M9 13h1m4 0h1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'focus-project', label: 'Project Focus', domain: 'jobs',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'meeting-professional', label: 'Professional Meeting', domain: 'jobs',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 3h20v13H2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 21l4-5 4 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="16" x2="12" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  {
    id: 'jobs-briefcase', label: 'Briefcase', domain: 'jobs',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  {
    id: 'jobs-chart', label: 'Analytics', domain: 'jobs',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  {
    id: 'jobs-laptop', label: 'Computer', domain: 'jobs',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M1 20h22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  },
  {
    id: 'jobs-clock', label: 'Time', domain: 'jobs',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><polyline points="12 7 12 12 15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  },
  {
    id: 'jobs-target', label: 'Goals', domain: 'jobs',
    svg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/></svg>',
  },
];

/** Return the SVG string for a given icon id, or '' if not found */
function getIconSvgById(iconId) {
  if (!iconId) return '';
  const entry = ICON_LIBRARY.find((icon) => icon.id === iconId);
  return entry ? entry.svg : '';
}

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

// ── Bucket Storage Framework ─────────────────────────────────────────────────

const BUCKETS_STORAGE_KEY = 'timescapeBuckets';

/** Generate a unique bucket ID */
function generateBucketId() {
  return 'bkt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

/** Retrieve all saved buckets from localStorage */
function loadBucketsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(BUCKETS_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

/** Append a bucket object to localStorage */
function saveBucketToStorage(bucketObj) {
  const buckets = loadBucketsFromStorage();
  buckets.push(bucketObj);
  localStorage.setItem(BUCKETS_STORAGE_KEY, JSON.stringify(buckets));
}

/** Find a single stored bucket by its ID */
function loadBucketById(id) {
  return loadBucketsFromStorage().find((b) => b.id === id) || null;
}

/** Replace a stored bucket in-place, matched by id */
function updateBucketInStorage(updatedBucket) {
  const buckets = loadBucketsFromStorage().map((b) => b.id === updatedBucket.id ? updatedBucket : b);
  localStorage.setItem(BUCKETS_STORAGE_KEY, JSON.stringify(buckets));
}

/** Delete a stored bucket by id */
function deleteBucketById(id) {
  const buckets = loadBucketsFromStorage().filter((b) => b.id !== id);
  localStorage.setItem(BUCKETS_STORAGE_KEY, JSON.stringify(buckets));
}

/** Return all buckets for a given domain */
function loadBucketsByDomain(domain) {
  return loadBucketsFromStorage().filter((b) => b.domain === domain);
}

/**
 * Populate a bucket <select> based on the current value of a paired domain <select>.
 * Adds a "— None —" blank option first, then one option per saved bucket in that domain.
 * Re-populates automatically whenever the domain select changes.
 *
 * @param {string} domainSelectId - id of the domain <select>
 * @param {string} bucketSelectId - id of the bucket <select> to populate
 */
function populateBucketSelect(domainSelectId, bucketSelectId) {
  const domainEl = document.getElementById(domainSelectId);
  const bucketEl = document.getElementById(bucketSelectId);
  if (!domainEl || !bucketEl) return;

  function refresh() {
    const domain = domainEl.value.toLowerCase();
    const buckets = loadBucketsByDomain(domain);
    bucketEl.innerHTML = '<option value="">— None —</option>';
    buckets.forEach((b) => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.title;
      bucketEl.appendChild(opt);
    });
  }

  refresh();
  domainEl.addEventListener('change', refresh);
}

/**
 * Build a normalized bucket object from the createBucketForm.
 * Returns null and alerts the user if required fields are missing.
 */
function buildBucketFromForm() {
  const form = document.getElementById('createBucketForm');
  if (!form) return null;

  const title = (document.getElementById('bucketTitle') || {}).value;
  if (!title || !title.trim()) {
    Swal.fire({ ...getSwalThemeOptions(), title: 'Missing title', text: 'Please enter a bucket title.', icon: 'warning', confirmButtonText: 'OK', showCancelButton: false });
    return null;
  }

  const domain = (document.getElementById('bucketDomain') || {}).value || '';

  // Determine which kind section is visible (project / tag / job)
  const kindSectionMap = {
    personal:  ['personalType1Options',  'personalType2Options'],
    household: ['householdType1Options', 'householdType2Options'],
    jobs:      ['jobsType0Options',      'jobsType1Options',      'jobsType2Options'],
  };
  const kindLabelMap = {
    personalType1Options:  'project',
    personalType2Options:  'tag',
    householdType1Options: 'project',
    householdType2Options: 'tag',
    jobsType0Options:      'job',
    jobsType1Options:      'project',
    jobsType2Options:      'tag',
  };

  let bucketKind = '';
  let subtypeOption = '';
  let description = '';
  let iconOverrideEnabled = false;
  let iconId = '';

  const sections = kindSectionMap[domain] || [];
  for (const sectionId of sections) {
    const section = document.getElementById(sectionId);
    if (!section) continue;
    if (window.getComputedStyle(section).display === 'none') continue;

    bucketKind = kindLabelMap[sectionId] || '';

    // Subtype option (select or hidden input for job buttons)
    const optionSelectors = {
      personalType1Options:  'personalType1Option',
      personalType2Options:  'personalType2Option',
      householdType1Options: 'householdType1Option',
      householdType2Options: 'householdType2Option',
      jobsType0Options:      'jobsType0Option',
      jobsType1Options:      'jobsType1Option',
      jobsType2Options:      'jobsType2Option',
    };
    const optionEl = document.getElementById(optionSelectors[sectionId]);
    subtypeOption = optionEl ? optionEl.value : '';

    // Description (only project/job sections have one)
    const descSelectors = {
      personalType1Options:  'personalType1Description',
      householdType1Options: 'householdType1Description',
      jobsType1Options:      'jobsType1Description',
    };
    const descEl = document.getElementById(descSelectors[sectionId]);
    description = descEl ? descEl.value.trim() : '';

    // Icon overwrite
    const iconRadioMap = {
      personalType1Options:  'personalIconOverwrite',
      personalType2Options:  'personalTagIconOverwrite',
      householdType1Options: 'householdIconOverwrite',
      householdType2Options: 'householdTagIconOverwrite',
      jobsType0Options:      'jobsJobIconOverwrite',
      jobsType1Options:      'jobsIconOverwrite',
      jobsType2Options:      'jobsTagIconOverwrite',
    };
    const iconInputMap = {
      personalType1Options:  'personalProjectIconId',
      personalType2Options:  'personalTagIconId',
      householdType1Options: 'householdProjectIconId',
      householdType2Options: 'householdTagIconId',
      jobsType0Options:      'jobsJobIconId',
      jobsType1Options:      'jobsProjectIconId',
      jobsType2Options:      'jobsTagIconId',
    };

    const radioName = iconRadioMap[sectionId];
    const checkedRadio = radioName
      ? form.querySelector(`input[type="radio"][name="${radioName}"]:checked`)
      : null;
    iconOverrideEnabled = checkedRadio ? checkedRadio.value === 'yes' : false;

    if (iconOverrideEnabled) {
      const iconInputEl = document.getElementById(iconInputMap[sectionId]);
      iconId = iconInputEl ? iconInputEl.value : '';
      if (!iconId) {
        Swal.fire({ ...getSwalThemeOptions(), title: 'No icon selected', text: 'You chose to override the icon — please select one, or choose "No".', icon: 'warning', confirmButtonText: 'OK', showCancelButton: false });
        return null;
      }
    }

    break; // found the visible section
  }

  if (!bucketKind) {
    Swal.fire({ ...getSwalThemeOptions(), title: 'No type selected', text: 'Please choose a bucket type (Project, Tag, or Job).', icon: 'warning', confirmButtonText: 'OK', showCancelButton: false });
    return null;
  }

  const now = new Date().toISOString();
  return {
    id: generateBucketId(),
    domain,
    bucketKind,
    title: title.trim(),
    subtypeOption,
    description,
    iconOverrideEnabled,
    iconId,
    createdAt: now,
    updatedAt: now,
  };
}

/** Wire the createBucketForm submit to build, validate, save, and close.
 * Call this once at the bottom of createBucket.html, after initCreateBucket().
 */
function attachBucketSaveHandler() {
  const form = document.getElementById('createBucketForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bucketObj = buildBucketFromForm();
    if (!bucketObj) return; // validation already alerted the user

    const editId = form.dataset.editId;
    if (editId) {
      // Edit mode: preserve original id and createdAt
      const original = loadBucketById(editId);
      updateBucketInStorage({
        ...bucketObj,
        id: editId,
        createdAt: original ? original.createdAt : bucketObj.createdAt,
        updatedAt: new Date().toISOString(),
      });
    } else {
      saveBucketToStorage(bucketObj);
    }

    closeBucketWindowAndRefresh(bucketObj.domain);
  });
}

// ── Bucket Rendering ─────────────────────────────────────────────────────────

/**
 * Render saved buckets for a domain into the .bucket-container element on a manage page.
 * @param {string} domain - 'personal' | 'household' | 'jobs'
 */
function renderManageBuckets(domain) {
  const container = document.querySelector('.bucket-container');
  if (!container) return;

  const buckets = loadBucketsByDomain(domain);
  container.innerHTML = '';

  if (!buckets.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No buckets yet. Add one above.';
    empty.style.gridColumn = '1 / -1';
    container.appendChild(empty);
    return;
  }

  buckets.forEach((bucket) => {
    const card = document.createElement('div');
    card.className = 'bucket';
    card.dataset.bucketId = bucket.id;

    if (bucket.iconOverrideEnabled && bucket.iconId) {
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'bucket-icon';
      iconWrapper.innerHTML = getIconSvgById(bucket.iconId);
      card.appendChild(iconWrapper);
    }

    const title = document.createElement('h2');
    title.textContent = bucket.title;
    card.appendChild(title);

    if (bucket.description) {
      const desc = document.createElement('p');
      desc.textContent = bucket.description;
      card.appendChild(desc);
    }

    const meta = document.createElement('p');
    const kindLabel = bucket.bucketKind
      ? bucket.bucketKind.charAt(0).toUpperCase() + bucket.bucketKind.slice(1)
      : '';
    meta.textContent = kindLabel;
    meta.style.fontSize = '12px';
    meta.style.color = '#555';
    card.appendChild(meta);

    container.appendChild(card);
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => _openBucketCardSwal(bucket));
  });
}

function _openBucketCardSwal(bucket) {
  Swal.fire({
    ...getSwalThemeOptions(),
    title: bucket.title,
    text: 'What would you like to do?',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: 'Edit Bucket',
    denyButtonText: 'View Report',
    cancelButtonText: 'Cancel',
  }).then((result) => {
    if (result.isConfirmed) {
      openEditBucketPopup(bucket.id);
    } else if (result.isDenied) {
      Swal.fire({
        ...getSwalThemeOptions(),
        title: 'Coming soon',
        text: 'Bucket reports will be available in a future update.',
        icon: 'info',
        confirmButtonText: 'OK',
        showCancelButton: false,
      });
    }
  });
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

// ── Icon Picker ──────────────────────────────────────────────────────────────

const _iconPicker = {
  targetInputId: null,
  previewContainerId: null,
  selectedIconId: null,
  activeDomain: null,
};

/** Render the icon grid, optionally filtered to a domain */
function renderIconPickerGrid(filterDomain) {
  const grid = document.getElementById('iconPickerGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const icons = filterDomain
    ? ICON_LIBRARY.filter((icon) => icon.domain === filterDomain)
    : ICON_LIBRARY;

  icons.forEach((icon) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-option' + (_iconPicker.selectedIconId === icon.id ? ' active' : '');
    btn.dataset.iconId = icon.id;
    // Sanitize label text via textContent to avoid XSS from label values
    const labelSpan = document.createElement('span');
    labelSpan.textContent = icon.label;
    btn.innerHTML = icon.svg;
    btn.appendChild(labelSpan);
    btn.addEventListener('click', () => {
      _iconPicker.selectedIconId = icon.id;
      grid.querySelectorAll('.icon-option').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      _updateIconPickerSelectionPreview();
    });
    grid.appendChild(btn);
  });
}

function _updateIconPickerSelectionPreview() {
  const selectionEl = document.getElementById('iconPickerSelection');
  if (!selectionEl) return;
  if (!_iconPicker.selectedIconId) {
    selectionEl.textContent = 'No icon selected.';
    return;
  }
  const entry = ICON_LIBRARY.find((i) => i.id === _iconPicker.selectedIconId);
  if (!entry) {
    selectionEl.textContent = 'No icon selected.';
    return;
  }
  const label = document.createElement('span');
  label.textContent = 'Selected: ' + entry.label;
  selectionEl.innerHTML = entry.svg;
  selectionEl.appendChild(label);
}

/**
 * Open the icon picker modal.
 * @param {string} targetInputId    - id of the hidden <input> to write the chosen iconId into
 * @param {string} previewContainerId - id of the <span> that shows a small SVG preview
 * @param {string} domain           - 'personal' | 'household' | 'jobs' — pre-selects the domain filter
 */
function openIconPicker(targetInputId, previewContainerId, domain) {
  _iconPicker.targetInputId = targetInputId;
  _iconPicker.previewContainerId = previewContainerId;
  _iconPicker.activeDomain = domain || null;

  // Pre-select any already-chosen icon
  const existingInput = document.getElementById(targetInputId);
  _iconPicker.selectedIconId = existingInput ? (existingInput.value || null) : null;

  const modal = document.getElementById('iconPickerModal');
  if (!modal) return;

  // Activate the matching domain filter chip
  modal.querySelectorAll('.icon-filter-button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.domain === domain);
  });

  renderIconPickerGrid(domain);
  _updateIconPickerSelectionPreview();
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function _closeIconPicker() {
  const modal = document.getElementById('iconPickerModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }
  _iconPicker.targetInputId = null;
  _iconPicker.previewContainerId = null;
  _iconPicker.selectedIconId = null;
  _iconPicker.activeDomain = null;
}

/** Wire cancel, confirm, filter chips, and backdrop-click on the icon picker modal */
function _attachIconPickerModalHandlers() {
  const modal = document.getElementById('iconPickerModal');
  if (!modal) return;

  const cancelBtn = document.getElementById('iconPickerCancel');
  const confirmBtn = document.getElementById('iconPickerConfirm');
  const filterRow = document.getElementById('iconFilterRow');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', _closeIconPicker);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (!_iconPicker.selectedIconId) {
        Swal.fire({
          ...getSwalThemeOptions(),
          title: 'No icon selected',
          text: 'Please choose an icon from the grid, or select "No" for icon overwrite.',
          icon: 'warning',
          confirmButtonText: 'OK',
          showCancelButton: false,
        });
        return;
      }

      // Write iconId into the hidden input
      const input = document.getElementById(_iconPicker.targetInputId);
      if (input) input.value = _iconPicker.selectedIconId;

      // Update the small inline preview next to the Select Icon button
      const preview = document.getElementById(_iconPicker.previewContainerId);
      if (preview) {
        const entry = ICON_LIBRARY.find((i) => i.id === _iconPicker.selectedIconId);
        if (entry) {
          const label = document.createElement('span');
          label.textContent = entry.label;
          preview.innerHTML = entry.svg;
          preview.appendChild(label);
        }
      }

      _closeIconPicker();
    });
  }

  if (filterRow) {
    filterRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.icon-filter-button');
      if (!btn) return;
      const domain = btn.dataset.domain;
      filterRow.querySelectorAll('.icon-filter-button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      _iconPicker.activeDomain = domain;
      renderIconPickerGrid(domain);
    });
  }

  // Close when clicking the backdrop (the semi-transparent overlay itself)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) _closeIconPicker();
  });
}
