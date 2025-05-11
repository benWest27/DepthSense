const puppeteer = require('puppeteer');
jest.setTimeout(60000);

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Login Flow Test', () => {
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

    it('should allow a user to login and verify JWT token', async () => {
        console.log("Starting login flow test...");

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

        // 5. Check if JWT token is stored in localStorage
        console.log("Checking if JWT token exists...");
        const jwt = await page.evaluate(() => localStorage.getItem('jwt'));
        expect(jwt).not.toBeNull();
        console.log("JWT token found:", jwt);

        // Optional: Verify the JWT token structure
        const jwtParts = jwt.split('.');
        expect(jwtParts.length).toBe(3); // JWT should have 3 parts: header, payload, signature
        console.log("JWT token structure verified.");
    });
});
