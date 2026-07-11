from playwright.sync_api import sync_playwright
import time

def verify_tabs():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto('http://localhost:5173')
            time.sleep(2) # wait for load

            # take interactive screenshot
            page.screenshot(path='/home/jules/verification/interactive.png')

            # click source code tab
            tabs = page.locator('.protocols__tab')
            if tabs.count() > 1:
                tabs.nth(1).click()
                time.sleep(1)
                page.screenshot(path='/home/jules/verification/source_code.png')
                print("Switched to Source Code tab")

            # click back to interactive
            tabs.nth(0).click()
            time.sleep(1)
            page.screenshot(path='/home/jules/verification/interactive_back.png')

        finally:
            browser.close()

if __name__ == '__main__':
    verify_tabs()
