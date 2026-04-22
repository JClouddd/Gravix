from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:3000")

        page.wait_for_timeout(3000)

        # Navigate to Colab using a visible locator
        page.get_by_text("Colab").click()

        page.wait_for_timeout(5000)
        page.screenshot(path="verification_colab.png")

        browser.close()

if __name__ == "__main__":
    verify()
