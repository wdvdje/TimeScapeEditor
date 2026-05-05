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

// reveal a hidden element when a button is clicked
function revealOnClick(buttonId, targetId) {
  const button = document.getElementById(buttonId);
  const target = document.getElementById(targetId);
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => {
    target.classList.remove('hidden');
    button.setAttribute('aria-expanded', 'true');
  });
}
