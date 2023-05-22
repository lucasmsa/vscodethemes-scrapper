import {
  OUTPUT_DIR,
  VSCODETHEMES_URL,
  PROGRAMMING_LANGUAGES,
  PAGES_LIMIT,
} from '../config/constants';
import * as fs from 'fs';
import * as url from 'url';
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer';
import { GeneratePageImageURL } from '../types/GeneratePageImageURL';
import { getThemeNameFromURL } from '../util/urlOperations/getThemeNameFromURL';
import { replaceLanguageInURL } from '../util/urlOperations/replaceLanguageInURL';

export class VscodeThemesCrawler {
  browser: Browser;
  page: Page;

  constructor() {
    this.browser = {} as Browser;
    this.page = {} as Page;
  }

  async initializeBrowser() {
    this.browser = await puppeteer.launch({ headless: 'new' });
    this.page = await this.browser.newPage();
  }

  async execute() {
    await this.initializeBrowser();

    for (let page = 1; page <= PAGES_LIMIT; page++)
      await this.processPage(page);

    await this.closeBrowser();
  }

  async processPage(page: number) {
    const newPageURL = url.resolve(VSCODETHEMES_URL, `?page=${page}`);
    await this.page.goto(newPageURL);

    const pageThemesImageURLs = await this.fetchPageImages();

    await this.savePageImages(pageThemesImageURLs);
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

        const outputPath = this.generatePageImageURL({
          themeOfficialName,
          themeURLName,
          language,
        });

        await themeImage?.screenshot({ path: outputPath });
      }
    }
  }

  generatePageImageURL({
    language,
    themeOfficialName,
    themeURLName,
  }: GeneratePageImageURL) {
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

  async closeBrowser() {
    this.browser.close();
  }
}
