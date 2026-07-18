from playwright.sync_api import sync_playwright, expect
import time

def verify_ai_streaming():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a new context with record_video_dir to save video
        context = browser.new_context(record_video_dir="/home/jules/verification/videos/")
        page = context.new_page()
        try:
            page.goto('http://localhost:5173')
            time.sleep(2) # wait for load

            # Click AI Rewrite button
            ai_btn = page.locator('#viewer-btn-ai-rewrite')
            ai_btn.click()
            time.sleep(1)

            # Fill out the dialog
            page.locator('.ai-user-info').fill('Test patient case')
            # Mock the API key logic - since we are mocking the network, any key works
            page.locator('.ai-api-key').fill('MOCK_KEY')

            # We need to mock the Google AI Fetch Models API
            page.route("https://generativelanguage.googleapis.com/v1beta/models", lambda route: route.fulfill(
                json={
                    "models": [
                        {"name": "models/gemini-pro", "supportedGenerationMethods": ["generateContent"]}
                    ]
                }
            ))

            # Mock the Google AI streaming endpoint
            def handle_sse(route):
                sse_data = (
                    "data: {\"event_type\":\"step.delta\",\"delta\":{\"type\":\"text\",\"text\":\"H\"}}\n\n"
                    "data: {\"event_type\":\"step.delta\",\"delta\":{\"type\":\"text\",\"text\":\"e\"}}\n\n"
                    "data: {\"event_type\":\"step.delta\",\"delta\":{\"type\":\"text\",\"text\":\"l\"}}\n\n"
                    "data: {\"event_type\":\"step.delta\",\"delta\":{\"type\":\"text\",\"text\":\"l\"}}\n\n"
                    "data: {\"event_type\":\"step.delta\",\"delta\":{\"type\":\"text\",\"text\":\"o\"}}\n\n"
                    "data: [DONE]\n\n"
                )
                route.fulfill(body=sse_data, headers={"Content-Type": "text/event-stream"})

            page.route("https://generativelanguage.googleapis.com/v1beta/interactions*", handle_sse)

            # Click Reload models
            page.locator('.btn-reload').click()
            time.sleep(1)

            # Click Start Rewrite
            page.locator('.btn-confirm').click()

            # Wait for streaming to finish and switch to interactive tab
            time.sleep(3)

            page.screenshot(path='/home/jules/verification/ai-streaming-success.png')
            print("Screenshot taken: /home/jules/verification/ai-streaming-success.png")

        finally:
            context.close()
            browser.close()

if __name__ == '__main__':
    verify_ai_streaming()
