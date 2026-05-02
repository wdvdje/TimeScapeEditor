
function itemsOptions() {
    Swal.fire({
        title: 'Editor',
        text: 'Create or manage items.',
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
            window.location.href = "URL_create.html";
        } else if (result.isDenied) {
            window.location.href = "URL_list.html";
        } else if (result.isDismissed) {
            console.log("The user cancelled the action");
        }
    });
}
