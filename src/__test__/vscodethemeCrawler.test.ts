import puppeteer from 'puppeteer';
import { VscodeThemesCrawler } from '../services/vscodethemesCrawler';
import * as fs from 'fs';
import { PAGES_LIMIT } from '../config/constants';

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn(),
      $$eval: jest.fn(),
      $: jest.fn(),
      evaluate: jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

describe('VscodeThemesCrawler', () => {
  let crawler: VscodeThemesCrawler;

  beforeEach(() => {
    crawler = new VscodeThemesCrawler();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize browser', async () => {
    await crawler.initializeBrowser();

    expect(puppeteer.launch).toHaveBeenCalledTimes(1);

    expect(crawler.browser.newPage).toHaveBeenCalledTimes(1);
  });

  test('should close browser', async () => {
    await crawler.initializeBrowser();

    await crawler.closeBrowser();

    expect(crawler.browser.close).toHaveBeenCalledTimes(1);
  });

  test(`should iterate over all of the ${PAGES_LIMIT} images`, async () => {
    const mockedImages = ['image1.png', 'image2.png', 'image3.png'];

    jest.spyOn(crawler, 'fetchPageImages').mockResolvedValue(mockedImages);
    jest.spyOn(crawler, 'processPage').mockResolvedValue();

    await crawler.execute();

    expect(crawler.processPage).toHaveBeenCalledTimes(PAGES_LIMIT);
  });
});
