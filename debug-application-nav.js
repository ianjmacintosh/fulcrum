const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login first
    console.log('Logging in...');
    await page.goto('http://localhost:3000/');
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByRole('textbox', { name: 'Email Address' }).fill(process.env.USER_EMAIL || '');
    await page.getByRole('textbox', { name: 'Password' }).fill(process.env.USER_PASSWORD || '');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('**/dashboard');

    // Go to applications page
    console.log('Navigating to applications page...');
    await page.goto('http://localhost:3000/applications');
    await page.waitForSelector('h1');
    
    // Check if there are any applications
    const applicationCards = await page.locator('.application-card-link').count();
    console.log(`Found ${applicationCards} application cards`);
    
    if (applicationCards > 0) {
      // Get the first card's href
      const firstCard = page.locator('.application-card-link').first();
      const href = await firstCard.getAttribute('href');
      console.log(`First application link: ${href}`);
      
      // Click on it
      console.log('Clicking on first application card...');
      await firstCard.click();
      
      // Wait a bit for navigation
      await page.waitForTimeout(2000);
      
      // Check current state
      const currentUrl = page.url();
      const pageTitle = await page.title();
      const h1Content = await page.locator('h1').textContent();
      const bodyContent = await page.locator('body').textContent();
      
      console.log(`Current URL: ${currentUrl}`);
      console.log(`Page title: ${pageTitle}`);
      console.log(`H1 content: ${h1Content}`);
      
      // Check if "Application not found" is present
      const notFoundVisible = await page.locator('text=Application not found').isVisible();
      console.log(`"Application not found" visible: ${notFoundVisible}`);
      
      // Check if "Application Details" is present
      const detailsVisible = await page.locator('text=Application Details').isVisible();
      console.log(`"Application Details" visible: ${detailsVisible}`);
      
      if (notFoundVisible) {
        console.log('ERROR: Application not found - this indicates the routing/API issue');
      }
    } else {
      console.log('No application cards found - need seed data');
    }
    
  } catch (error) {
    console.error('Debug script error:', error);
  } finally {
    await browser.close();
  }
})();