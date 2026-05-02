
function itemsOptions() {
    Swal.fire({
        title: 'Editor',
        text: 'Create or manage items.',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonColor: 'blue',
        cancelButtonColor: 'blue',
        denyButtonColor: 'gray',
        confirmButtonText: 'Create',
        cancelButtonText: 'Manage',
        denyButtonText: 'Cancel',
        reverseButtons: false
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "URL_create.html";
        } else if (result.isDenied) {
            window.location.href = "URL_list.html";
        } else if (result.isDismissed) {
            console.log("The user cancelled the action);
        }
    });
}