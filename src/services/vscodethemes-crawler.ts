import puppeteer, { Browser, Page } from 'puppeteer';
import {
  OUTPUT_DIR,
  PROGRAMMING_LANGUAGES,
  VSCODETHEMES_URL,
} from '../config/constants';
import * as fs from 'fs';
import * as path from 'path';
import { getThemeNameFromURL } from '../util/getThemeNameFromURL';
import { replaceLanguageInURL } from '../util/replaceLanguageInURL';

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

    const pageThemesImageURLs = await this.fetchPageImages();
    await this.savePageImages(pageThemesImageURLs);

    await this.browser.close();
  }

  async fetchPageImages() {
    const pageThemesImageURLs = await this.page.$$eval('img', (images) =>
      images.map((image) => image.src),
    );

    return pageThemesImageURLs;
  }

  async savePageImages(pageThemesImageURLs: string[]) {
    for (const initialThemeImageURL of pageThemesImageURLs) {
      await this.page.goto(initialThemeImageURL);

      const themeURLName = getThemeNameFromURL(initialThemeImageURL) as string;
      const themeOfficialName = await this.getThemeOfficialName();

      const themeDirectory = path.join(OUTPUT_DIR, themeOfficialName);

      if (!fs.existsSync(themeDirectory)) fs.mkdirSync(themeDirectory);

      for (const language of PROGRAMMING_LANGUAGES) {
        const themeImageURL = replaceLanguageInURL(
          initialThemeImageURL,
          language,
        );
        await this.page.goto(themeImageURL);
        await this.page.waitForSelector('svg > rect:nth-child(1)');
        const themeImage = await this.page.$('svg > rect:nth-child(1)');

        const outputPath = this.generatePageImageURL(
          themeOfficialName,
          themeURLName,
          language,
        );
        await themeImage?.screenshot({ path: outputPath });
      }
    }
  }

  generatePageImageURL(
    themeOfficialName: string,
    themeURLName: string,
    language: string,
  ) {
    return path.join(
      OUTPUT_DIR,
      themeOfficialName,
      `${themeURLName}-${language}.png`,
    );
  }

  async getThemeOfficialName() {
    const themeOfficialNameElement = await this.page.$('text[x="50%"][y="14"]');
    const themeOfficialName = (await this.page.evaluate(
      (el) => el?.textContent,
      themeOfficialNameElement,
    )) as string;

    return themeOfficialName?.replace('/', '|');
  }

  async close() {
    this.browser.close();
  }
}
