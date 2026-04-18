import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(record_video_dir="videos/", viewport={"width": 1280, "height": 720})
        page = await context.new_page()

        # Go to home
        print("Navigating to home...")
        await page.goto("http://localhost:3000")

        # Wait for the tour to be visible
        print("Waiting for tour...")
        await page.wait_for_selector("text=Welcome to Gravix", timeout=10000)
        await page.screenshot(path="screenshot_tour_1.png")

        # Click Next through the tour
        for _ in range(7):
            print("Clicking Next...")
            await page.click("button:has-text('Next')")
            await asyncio.sleep(0.5)

        print("Clicking Finish...")
        await page.click("button:has-text('Finish')")

        print("Going to Settings...")
        # Navigate to Settings
        await page.click("button[title='Settings']")
        await page.wait_for_selector("text=Settings", timeout=5000)

        print("Taking settings screenshot...")
        await page.screenshot(path="screenshot_settings.png")

        # Test the "Restart Tour" button
        print("Clicking Restart Tour...")
        page.on("dialog", lambda dialog: dialog.accept()) # Auto-accept the alert
        await page.click("button:has-text('Restart Tour')")

        # Wait for reload and tour to be visible again
        await page.wait_for_selector("text=Welcome to Gravix", timeout=10000)
        await page.screenshot(path="screenshot_tour_restarted.png")
        print("Tour restarted successfully.")

        await context.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
