import {
  PAGES_LIMIT,
  VSCODETHEMES_URL,
  PROGRAMMING_LANGUAGES,
} from '../config/constants';
import * as url from 'url';
import { S3Client } from './s3Client';
import * as cliProgress from 'cli-progress';
import puppeteer, { Browser, Page } from 'puppeteer';
import { getThemeNameFromURL } from '../util/urlOperations/getThemeNameFromURL';
import { replaceLanguageInURL } from '../util/urlOperations/replaceLanguageInURL';
import { progressBarConfigurations } from '../config/progressBarConfigurations';

export class VscodeThemesCrawler {
  browser: Browser;
  page: Page;
  s3: S3Client;
  progressBar: cliProgress.SingleBar;

  constructor() {
    this.browser = {} as Browser;
    this.page = {} as Page;
    this.s3 = new S3Client();
    this.progressBar = new cliProgress.SingleBar(
      progressBarConfigurations.opt,
      progressBarConfigurations.preset,
    );
  }

  async initializeBrowser() {
    this.browser = await puppeteer.launch({ headless: 'new' });
    this.page = await this.browser.newPage();
  }

  async execute() {
    await this.initializeBrowser();
    await this.processAllPages();
    await this.closeBrowser();
  }

  async processAllPages() {
    this.progressBar.start(PAGES_LIMIT, 0);
    for (let page = 1; page <= PAGES_LIMIT; page++) {
      this.progressBar.update(page);
      await this.processPage(page);
    }
    this.progressBar.stop();
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

      const themeURLName = getThemeNameFromURL(initialThemeImageURL);
      const themeOfficialName = await this.getThemeOfficialName();

      for (const language of PROGRAMMING_LANGUAGES) {
        const themeImageURL = replaceLanguageInURL(
          initialThemeImageURL,
          language,
        );
        await this.page.goto(themeImageURL);
        await this.page.waitForSelector('svg > rect:nth-child(1)');
        const themeImage = await this.page.$('svg > rect:nth-child(1)');

        const buffer = (await themeImage?.screenshot()) as Buffer;
        const key = `${themeOfficialName}/${themeURLName}-${language}.png`;

        await this.s3.uploadFile({
          bucket: process.env.BUCKET_NAME as string,
          key,
          body: buffer,
        });
      }
    }
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
