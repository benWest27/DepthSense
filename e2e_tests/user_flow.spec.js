const puppeteer = require('puppeteer');

// Increase the global timeout for all tests
jest.setTimeout(90000); // Increase timeout to 90 seconds

describe('User Flow Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000); // Set navigation timeout to 60 seconds
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should allow a user to register, login, and create a visualization', async () => {
    console.log("Starting user flow test...");

    // Visit the registration page
    console.log("Navigating to registration page...");
    await page.goto('http://localhost/register');
    await page.type('#registerUsername', 'testuser');
    await page.type('#email', 'test@example.com');
    await page.type('#registerPassword', 'password');
    await page.click('#registerSubmitBtn');

    // Wait for registration to complete
    console.log("Waiting for registration to complete...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Add a short delay to ensure the server processes the request

    // Visit the login page
    console.log("Navigating to login page...");
    await page.goto('http://localhost/login');
    await page.type('#loginUsername', 'testuser');
    await page.type('#loginPassword', 'password');
    await page.click('#loginBtn');

    // Wait for redirection to the editor page
    console.log("Waiting for redirection to the editor page...");
    try {
      await page.waitForNavigation({ timeout: 60000 }); // Increase navigation timeout
    } catch (error) {
      console.error("Navigation to editor page failed:", error);
      throw error;
    }

    // Visit the editor page
    console.log("Navigating to editor page...");
    await page.goto('http://localhost/editor');
    await page.select('#data-source-select', 'source1');
    await page.click('#add-layer');
    await page.click('#save');

    // Verify that the visualization was saved successfully
    console.log("Verifying visualization save...");
    const saveMessage = await page.evaluate(() => document.body.textContent.includes('Visualization saved successfully'));
    expect(saveMessage).toBe(true);

    console.log("User flow test completed successfully.");
  });
});