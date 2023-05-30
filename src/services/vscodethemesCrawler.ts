import {
  PAGES_LIMIT,
  VSCODETHEMES_URL,
  PROGRAMMING_LANGUAGES,
} from '../config/constants';
import * as url from 'url';
import winston from 'winston';
import { S3Client } from './s3Client';
import puppeteer from 'puppeteer-extra';
import { Browser, Page } from 'puppeteer';
import * as cliProgress from 'cli-progress';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { UploadFileInterface } from '../types/UploadFileInterface';
import { initializeLogger } from '../util/logging/initializeLogger';
import { progressBarConfigurations } from '../config/progressBarConfigurations';
import { getThemeNameFromURL } from '../util/urlOperations/getThemeNameFromURL';
import { replaceLanguageInURL } from '../util/urlOperations/replaceLanguageInURL';
import { handleInitialBrowserSetup } from '../util/browserOperations/handleInitialBrowserSetup';
import { handleNavigation } from '../util/browserOperations/handleNavigation';
import { SaveImagesInterface } from '../types/SaveImagesInterface';
import { handleNotFoundLabel } from '../util/browserOperations/handleNotFoundLabel';
import { handleThemeOfficialName } from '../util/browserOperations/handleThemeOfficialName';

puppeteer.use(StealthPlugin());

export class VscodeThemesCrawler {
  page: Page;
  s3: S3Client;
  browser: Browser;
  pageNumber: number;
  logger: winston.Logger;
  progressBar: cliProgress.SingleBar;

  constructor() {
    this.browser = {} as Browser;
    this.page = {} as Page;
    this.s3 = new S3Client();
    this.logger = initializeLogger();
    this.progressBar = new cliProgress.SingleBar(
      progressBarConfigurations.opt,
      progressBarConfigurations.preset,
    );
    this.pageNumber = 36;
  }

  async initializeBrowser() {
    const { browser, page } = await handleInitialBrowserSetup(puppeteer);
    this.browser = browser;
    this.page = page;
  }

  async execute() {
    await this.initializeBrowser();
    await this.processAllPages();
    await this.quitBrowser();
  }

  async processAllPages() {
    this.progressBar.start(PAGES_LIMIT, this.pageNumber);
    while (this.pageNumber <= PAGES_LIMIT) {
      await this.processPage(this.pageNumber);
      this.pageNumber++;
      this.progressBar.update(this.pageNumber);
      await this.restartBrowser();
    }
  }

  async gotoPage(pageURL: string) {
    try {
      await handleNavigation({
        page: this.page,
        pageURL: pageURL,
        logger: this.logger,
      });
    } catch (error) {
      this.logger.error(
        `Failed to navigate to page ${pageURL}. Error: ${error}`,
      );
    }
  }

  async processPage(page: number) {
    const newPageURL = url.resolve(VSCODETHEMES_URL, `?page=${page}`);
    await this.gotoPage(newPageURL);

    const pageThemesImageURLs = await this.fetchPageImageURLs();

    await this.savePageImageURLs(pageThemesImageURLs);
  }

  async fetchPageImageURLs() {
    return this.page.$$eval('img', (images) =>
      images.map((image) => image.src),
    );
  }

  async savePageImageURLs(pageThemesImageURLs: string[]) {
    for (const initialThemeImageURL of pageThemesImageURLs) {
      const themeURLName = getThemeNameFromURL(initialThemeImageURL);

      if (!themeURLName.length) continue;

      await this.gotoPage(initialThemeImageURL);
      const themeOfficialName = await handleThemeOfficialName(this.page);
      await this.saveImagesForAllLanguages({
        initialThemeImageURL,
        themeURLName,
        themeOfficialName,
      });
    }
  }

  async saveImagesForAllLanguages({
    initialThemeImageURL,
    themeURLName,
    themeOfficialName,
  }: SaveImagesInterface) {
    for (const language of PROGRAMMING_LANGUAGES) {
      const themeImageURL = replaceLanguageInURL(
        initialThemeImageURL,
        language,
      );

      await this.gotoPage(themeImageURL);
      const imageLabelNotFound = await handleNotFoundLabel(this.page);

      if (imageLabelNotFound) continue;

      await this.page.waitForSelector('svg > rect:nth-child(1)');
      const themeImage = await this.page.$('svg > rect:nth-child(1)');

      if (!themeImage) await this.restartBrowser();

      const buffer = (await themeImage?.screenshot()) as Buffer;
      const key = `${themeOfficialName}/${themeURLName}-${language}.png`;

      await this.uploadFileToS3({
        bucket: process.env.BUCKET_NAME as string,
        key,
        body: buffer,
      });
    }
  }

  async restartBrowser() {
    await this.browser.close();
    await this.execute();
  }

  async uploadFileToS3({ body, bucket, key }: UploadFileInterface) {
    try {
      await this.s3.uploadFile({ bucket, key, body });
    } catch (error) {
      this.logger.error(`Failed to upload image to S3. Error: ${error}`);
    }
  }

  async quitBrowser() {
    await this.browser.close();
    this.progressBar.stop();
  }
}
