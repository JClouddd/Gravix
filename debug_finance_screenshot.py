from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="videos/")
        page = context.new_page()

        print("Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000")

        print("Waiting for sidebar load...")
        page.wait_for_selector(".sidebar", timeout=10000)

        print("Clicking Finance nav item...")
        finance_btn = page.locator("#nav-finance")
        finance_btn.wait_for(state="visible", timeout=10000)
        finance_btn.click()

        print("Waiting for 3 seconds...")
        page.wait_for_timeout(3000)

        print("Taking debug screenshot...")
        page.screenshot(path="debug_finance_tab.png")

        # Dump the HTML content of the main app container
        html = page.inner_html(".module-container")
        with open("module_container.html", "w") as f:
            f.write(html)

        print("Done.")
        context.close()
        browser.close()

if __name__ == "__main__":
    run()
