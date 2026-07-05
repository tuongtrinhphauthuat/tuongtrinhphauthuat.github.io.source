from playwright.sync_api import sync_playwright, expect
import time

def verify_push_version_dialog():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto('http://localhost:5173')
            time.sleep(2) # wait for load

            # we need to trigger 'push version'. it is at the bottom bar
            push_btn = page.locator('.btn-push') # or '#display-btn-copy-source' next to it? no, there's a button class="icon-btn btn-push"

            # the push button only appears when 'hasEditedStatus' is true. We might need to edit a version title to trigger this
            # In viewer, we can click a bracket to edit something. Or we can just evaluate something on window

            # Since hasEditedStatus requires something to be edited, let's edit the content.
            content_editable = page.locator('#viewer-content-editable')
            content_editable.click()
            content_editable.type('test edit')
            time.sleep(1)

            push_btn = page.locator('.btn-push')
            push_btn.click(force=True)
            time.sleep(1)

            # Take screenshot of the Push Version dialog
            page.screenshot(path='/home/jules/verification/push-version-dialog.png')
            print("Screenshot taken")

        finally:
            browser.close()

if __name__ == '__main__':
    verify_push_version_dialog()
