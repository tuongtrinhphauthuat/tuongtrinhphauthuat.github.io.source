1. **Update `PushVersionDialog.vue`:**
    - Allow users to edit the "Tên phiên bản" with a default value of `editedVersionTitle + ' copy'`.
    - Modify the logic for "Tạo cột mới" (New column mode):
        - By default, it should find the first empty column.
        - If all existing columns are filled, it should create a new column named `Nội dung N+1`.
        - Make the "Tạo cột mới" option dynamically figure out this default name.
    - Show a loading/progress indicator during the push process.
2. **Update `scripts/AppScript.js`:**
    - Add logic to verify that the uploaded content is strictly distinct from all existing versions (prevent duplicates). Return an error if it matches exactly.
3. **Add `UploadImageDialog.vue`:**
    - Create a new dialog component based on the provided logic.
    - Add inputs for URL, Protocol, Variable linking, and Description.
    - Validate and show a preview of the image URL.
    - Call the appropriate Apps Script endpoint to append the image to the correct row.
4. **Update `MenuBar.vue` & `menuService.js`:**
    - Add "Đăng ảnh lên" to the "Chỉnh sửa" menu.
    - Wire it up in `ProtocolDisplay.vue` to show the `UploadImageDialog`.
5. **Update `ProtocolDisplay.vue`:**
    - Import and include `<UploadImageDialog>` conditionally.
    - Handle the `open-upload-image` action from the menu to show the dialog.
6. **Pre-commit checks**:
    - Run pre-commit instructions.
