from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:5173')

        # Wait for items to load
        time.sleep(2)
        print("Page loaded, getting items")
        items = page.locator('.protocols__list-item').count()
        print("Items:", items)
        if items == 0:
            print("No items, let's wait a bit more")
            time.sleep(5)
            items = page.locator('.protocols__list-item').count()
            print("Items now:", items)

        if items > 0:
            page.locator('.protocols__item-header').first.click()
            time.sleep(2)

            page.click('button:has-text("Source Code")')
            page.fill('.protocols__source-textarea', 'Hello ... World')
            page.click('button:has-text("Interactive")')
            time.sleep(1)

            span = page.locator('.bracket-input').first
            print("Span visible:", span.is_visible())

            page.click('.bracket-input')

            page.keyboard.type('Test')

            html = page.inner_html('.protocols__editor-content')
            print("Final HTML:", html)
            print("Did it contain Test?", "Test" in html)

        browser.close()

if __name__ == '__main__':
    run()
