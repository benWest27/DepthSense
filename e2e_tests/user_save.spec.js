const puppeteer = require('puppeteer');
jest.setTimeout(60000);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('User Flow Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    console.log("Browser launched and new page created.");
  });

  afterAll(async () => {
    await browser.close();
    console.log("Browser closed.");
  });

  it(
    'should login, add a layer, and save the visualization',
    async () => {
      console.log("Starting user flow test...");

      const testUsername = `admin1`;
      const testPassword = `password`;

      // 1. Go to root page
      console.log("Navigating to http://localhost...");
      await page.goto('http://localhost');

      // 2. Open login overlay
      console.log("Clicking login button...");
      await page.click('.login-button');
      console.log("Waiting for login username field...");
      await page.waitForSelector('#login-username', { visible: true });

      // 3. Fill login form
      console.log("Filling login form...");
      await page.type('#login-username', testUsername);
      await page.type('#login-password', testPassword);
      console.log("Submitting login form...");
      await page.click('#login-button');

      // 4. Wait for redirection to /editor
      console.log("Waiting for redirection to /editor...");
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      expect(page.url()).toContain('/editor');

      // 5. Test adding a layer
      console.log("Waiting for data-source dropdown...");
      await page.waitForSelector('#data-source-select', { visible: true });
      console.log("Selecting data source and creating layer...");
      await page.select('#data-source-select', 'source1');
      console.log("Clicking the Add Layer button...");
      await page.click('#add-layer');
      await delay(1000); // Add a delay to ensure the DOM updates
      
      const panelHTML = await page.evaluate(() => {
        const panel = document.getElementById('layer-panel');
        return panel ? panel.innerHTML : null;
      });
      console.log("Layer panel HTML:", panelHTML);

      // Verify the presence of layer-tab elements
      const layerTabsCount = await page.evaluate(() => {
        const panel = document.getElementById('layer-panel');
        return panel ? panel.querySelectorAll('.layer-tab').length : 0;
      });
      console.log("Number of layer-tab elements:", layerTabsCount);
      expect(layerTabsCount).toBeGreaterThan(0);

      // 6. Save the visualization
      console.log("Clicking the Save button...");
      await page.click('#save');
      console.log("Waiting for save modal...");
      await page.waitForSelector('#viz-name-input', { visible: true });
      console.log("Filling in visualization name and submitting...");
      await page.type('#viz-name-input', 'Test Visualization');
      await page.click('#save-submit-btn');

      // Verify the success message
      console.log("Waiting for status message...");
      await page.waitForSelector('#status-message', { visible: true });
      const statusMessage = await page.evaluate(() => {
        const statusEl = document.getElementById('status-message');
        return statusEl ? statusEl.textContent : null;
      });
      console.log("Status message content:", statusMessage);
      expect(statusMessage).not.toBeNull();
      expect(statusMessage.toLowerCase()).toContain('saved');

      console.log("User flow test completed successfully.");
    },
    60000
  );
});
