import puppeteer from 'puppeteer-extra';
import { VscodeThemesCrawler } from '../services/vscodethemesCrawler';
import { PAGES_LIMIT } from '../config/constants';
import { mockedImages } from './factory/crawlerFactory';

jest.mock('@aws-sdk/client-s3', () => ({
  S3: jest.fn(),
}));

jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
    add: jest.fn(),
  }),
  format: {
    json: jest.fn(),
    simple: jest.fn(),
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn(),
  },
}));

jest.mock('puppeteer-extra', () => ({
  use: jest.fn(),
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn(),
      $$eval: jest.fn(),
      $: jest.fn(),
      evaluate: jest.fn(),
      setUserAgent: jest.fn(),
      setExtraHTTPHeaders: jest.fn(),
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

  test(`should iterate over all of the ${PAGES_LIMIT} pages`, async () => {
    jest.spyOn(crawler, 'fetchPageImageURLs').mockResolvedValue(mockedImages);
    jest.spyOn(crawler, 'processPage').mockResolvedValue();

    await crawler.execute();

    expect(crawler.processPage).toHaveBeenCalledTimes(PAGES_LIMIT);
  });

  test('should log error if page navigation fails', async () => {
    jest.spyOn(crawler, 'fetchPageImageURLs').mockResolvedValue(mockedImages);
    jest.spyOn(crawler, 'savePageImageURLs').mockResolvedValue();
    crawler.page.$$eval = jest.fn();

    await crawler.processPage(1);

    expect(crawler.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to navigate to page'),
    );
  });
});
