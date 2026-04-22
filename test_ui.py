from playwright.sync_api import sync_playwright

def test_chat():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000/")
        page.wait_for_timeout(5000)
        page.screenshot(path="/tmp/verification.png")
        browser.close()

if __name__ == "__main__":
    test_chat()
