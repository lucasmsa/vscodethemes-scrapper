import puppeteer, { Browser, Page } from 'puppeteer';
import { VSCODETHEMES_URL } from '../config/constants';

export class VscodeThemesCrawler {
  browser: Browser;
  page: Page;

  constructor() {
    this.browser = new Browser();
    this.page = new Page();
  }

  async execute() {
    this.browser = await puppeteer.launch({ headless: false });
    this.page = await this.browser.newPage();

    await this.page.goto(VSCODETHEMES_URL);
    await this.fetchImages();

    await this.browser.close();
  }

  async fetchImages() {
    const themeImageURLs = await this.page.$$eval('img', (images) =>
      images.map((image) => image.src),
    );

    await this.page.goto(themeImageURLs[0]);
    await this.page.waitForSelector('svg > rect:nth-child(1)');
    const themeImage = await this.page.$('svg > rect:nth-child(1)');
    await themeImage?.screenshot({ path: 'theme.png' });
  }

  async close() {
    this.browser.close();
  }
}
