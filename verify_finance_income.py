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

        print("Waiting for Finance module to load...")
        page.wait_for_timeout(2000)

        print("Clicking Income Tracker tab...")
        income_tab = page.locator("button", has_text="Income Tracker")
        income_tab.wait_for(state="visible", timeout=10000)
        income_tab.click()

        print("Waiting for Income Tracker content to load...")
        page.wait_for_timeout(2000)

        print("Taking screenshot...")
        page.screenshot(path="finance_income.png")

        print("Done.")
        context.close()
        browser.close()

if __name__ == "__main__":
    run()
