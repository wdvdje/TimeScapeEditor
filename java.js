// items dialogues
function itemsOptions(createLink, manageLink, item) {
    Swal.fire({
        title: `${item} Editor`,
        text: `Create or manage ${item.toLowerCase()}.`,
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
            window.location.href = createLink;
        } else if (result.isDenied) {
            window.location.href = manageLink;
        } else if (result.isDismissed) {
            console.log("The user cancelled the action");
        }
    });
}

// today's date
const dateElement = document.getElementById('current-date');
const today = new Date();
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const dateFormat = today.toLocaleDateString('en-US', options);
dateElement.textContent = dateFormat;
