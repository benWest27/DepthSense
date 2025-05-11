const puppeteer = require('puppeteer');
jest.setTimeout(60000);

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('User Registration Test', () => {
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

    it('should allow a user to register', async () => {
        console.log("Starting user registration test...");

        const uniqueSuffix = Date.now();
        const testPassword = `password`;

        // 1. Go to root page
        console.log("Navigating to http://localhost...");
        await page.goto('http://localhost');

        // 2. Open registration overlay
        console.log("Clicking register button...");
        await page.click('a[href="#register"]'); // Update this to the correct selector
        console.log("Waiting for register username field...");
        await page.waitForSelector('#register-username', { visible: true });

        // 3. Fill registration form
        console.log("Filling registration form...");
        await page.type('#register-username', `testuser${uniqueSuffix}`);
        await page.type('#register-email', `test${uniqueSuffix}@example.com`);
        await page.type('#register-password', testPassword);
        console.log("Submitting registration form...");
        await page.click('#register-button');
        await delay(2000);

        console.log("Attempting to log in with registered credentials...");
        const loginResponse = await page.evaluate(async (username, password) => {
            const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
            });
            if (!response.ok) throw new Error("Authentication failed");
            return response.json();
        }, `testuser${uniqueSuffix}`, testPassword);

        console.log("Login response received:", loginResponse);
        if (loginResponse && loginResponse.token) {
            console.log("Login successful, token received:", loginResponse.token);
        } else {
            throw new Error("Login failed: No token received");
        }
    });
});