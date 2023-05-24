import {
  PUPPETEER_ACCEPT_LANGUAGE,
  PUPPETEER_USER_AGENT,
} from '../../config/constants';
import { PuppeteerExtra } from 'puppeteer-extra';

export async function handleInitialBrowserSetup(puppeteer: PuppeteerExtra) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setUserAgent(PUPPETEER_USER_AGENT);
  await page.setExtraHTTPHeaders({
    'Accept-Language': PUPPETEER_ACCEPT_LANGUAGE,
  });

  return { browser, page };
}
